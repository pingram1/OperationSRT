const User = require('../models/User');
const Booking = require('../models/Booking');
const SystemConfig = require('../models/SystemConfig');
const { LearningStyleProfile, LearningStyleMatcher } = require('../utils/matchingUtils');

// Use lower threshold for admin analysis (0.5 = 50%), higher for regular users (0.75 = 75%)
// Loads matchingWeights from SystemConfig when available
const getMatcher = async (isAdminRequest = false) => {
    const config = await SystemConfig.getConfig();
    const mw = config.matchingWeights;
    const weights = (mw && mw.styleCompatibility != null && mw.subjectMatch != null && mw.teachingAlignment != null)
        ? { styleCompatibility: mw.styleCompatibility, subjectMatch: mw.subjectMatch, teachingAlignment: mw.teachingAlignment }
        : null;
    return new LearningStyleMatcher(isAdminRequest ? 0.5 : 0.75, weights);
};

/**
 * @desc    Find best tutor matches for a student
 * @route   POST /api/matching/find-tutors
 * @access  Private
 */
const findTutorMatches = async (req, res) => {
    try {
        const { studentId, subject, limit = 3, preferredDays, preferredTimeRange } = req.body;
        const requestingUserId = req.user.id;

        // Verify student exists and user has permission
        const student = await User.findById(studentId || requestingUserId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if requesting user is the student, a parent of the student, or an admin
        // Convert both to strings for comparison
        const studentIdStr = studentId ? String(studentId) : null;
        const requestingUserIdStr = String(requestingUserId);
        
        const isAuthorized = 
            !studentIdStr || // If no studentId provided, use requesting user
            studentIdStr === requestingUserIdStr ||
            (student.parent && String(student.parent) === requestingUserIdStr) ||
            req.user.role === 'admin' ||
            req.user.role === 'super_admin';

        if (!isAuthorized && studentIdStr && studentIdStr !== requestingUserIdStr) {
            return res.status(403).json({ message: 'Not authorized to find matches for this student' });
        }

        // Check if student has completed assessment
        if (!student.learningStyleProfile?.assessmentCompleted) {
            return res.status(400).json({ 
                message: 'Student must complete learning style assessment before matching',
                requiresAssessment: true
            });
        }

        // Build student profile from user data
        const subjectsOfInterest = [...(student.studentProfile?.subjectOfFocus || [])];
        if (subject && !subjectsOfInterest.includes(subject)) {
            subjectsOfInterest.push(subject);
        }
        const studentProfile = new LearningStyleProfile(
            student.name,
            {
                visual_verbal: student.learningStyleProfile.dimensions.visual_verbal,
                sequential_global: student.learningStyleProfile.dimensions.sequential_global,
                active_reflective: student.learningStyleProfile.dimensions.active_reflective,
                structured_flexible: student.learningStyleProfile.dimensions.structured_flexible,
                learningNeeds: student.learningStyleProfile.learningNeeds || [],
                subjectsOfInterest
            }
        );

        // Find available tutors (active tutors or super_admins with availableAsTutor)
        // For admin/super_admin requests, also include all tutors with assessments for analysis purposes
        const isAdminRequest = req.user.role === 'admin' || req.user.role === 'super_admin';
        
        const tutorQuery = {
            'learningStyleProfile.assessmentCompleted': true
        };

        if (isAdminRequest) {
            // For admin analysis, include all tutors and super_admins with completed assessments
            tutorQuery.$or = [
                { role: 'tutor' },
                { role: 'super_admin' }
            ];
        } else {
            // For regular users, only show active/available tutors
            tutorQuery.$or = [
                { role: 'tutor', 'tutorInfo.status': 'active' },
                { role: 'super_admin', availableAsTutor: true }
            ];
        }

        // Filter by subject if specified
        if (subject) {
            tutorQuery['tutorInfo.subjects'] = subject;
        }

        const tutorUsers = await User.find(tutorQuery)
            .select('name email avatar role tutorInfo learningStyleProfile availableAsTutor');

        if (tutorUsers.length === 0) {
            return res.json({ 
                tutors: [],
                message: 'No available tutors found matching the criteria'
            });
        }

        // Convert tutor users to LearningStyleProfile objects
        const tutorProfiles = tutorUsers.map(tutorUser => {
            const profile = new LearningStyleProfile(
                tutorUser.name,
                {
                    visual_verbal: tutorUser.learningStyleProfile?.dimensions?.visual_verbal || 5,
                    sequential_global: tutorUser.learningStyleProfile?.dimensions?.sequential_global || 5,
                    active_reflective: tutorUser.learningStyleProfile?.dimensions?.active_reflective || 5,
                    structured_flexible: tutorUser.learningStyleProfile?.dimensions?.structured_flexible || 5,
                    teachingStrengths: tutorUser.learningStyleProfile?.teachingStrengths || [],
                    subjectExpertise: tutorUser.learningStyleProfile?.subjectExpertise ? 
                        Object.fromEntries(tutorUser.learningStyleProfile.subjectExpertise) : {}
                }
            );
            // If subjectExpertise is empty but tutorInfo.subjects exists, populate with default proficiency (5/10)
            if (Object.keys(profile.subjectExpertise).length === 0 && tutorUser.tutorInfo?.subjects?.length > 0) {
                tutorUser.tutorInfo.subjects.forEach(s => {
                    profile.subjectExpertise[s] = 5;
                });
            }
            // Attach user data for response
            profile.userData = {
                _id: tutorUser._id,
                name: tutorUser.name,
                email: tutorUser.email,
                avatar: tutorUser.avatar,
                role: tutorUser.role,
                tutorInfo: tutorUser.tutorInfo,
                availableAsTutor: tutorUser.availableAsTutor
            };
            return profile;
        });

        // Phase 5: Load system schedule when availability preferences provided
        let systemSchedule = null;
        if (preferredDays && Array.isArray(preferredDays) && preferredDays.length > 0 && preferredTimeRange && typeof preferredTimeRange === 'object') {
            const config = await SystemConfig.getConfig();
            systemSchedule = config.tutorSchedule?.weeklySchedule || [];
        }

        // Phase 7: Aggregate historical ratings per tutor from matchFeedback
        const feedbackAgg = await Booking.aggregate([
            { $match: { tutor: { $in: tutorUsers.map(u => u._id) }, 'matchFeedback.actualRating': { $exists: true, $ne: null } } },
            { $group: { _id: '$tutor', avgRating: { $avg: '$matchFeedback.actualRating' }, count: { $sum: 1 } } }
        ]);
        const tutorHistoricalScores = {};
        feedbackAgg.forEach(row => {
            tutorHistoricalScores[String(row._id)] = row.avgRating;
        });

        // Find optimal matches (use lower threshold for admin analysis)
        const matcher = await getMatcher(isAdminRequest);
        const matchOptions = {
            preferredDays: preferredDays && Array.isArray(preferredDays) ? preferredDays : undefined,
            preferredTimeRange: preferredTimeRange && preferredTimeRange.start && preferredTimeRange.end ? preferredTimeRange : undefined,
            systemSchedule,
            tutorHistoricalScores: Object.keys(tutorHistoricalScores).length > 0 ? tutorHistoricalScores : undefined
        };
        const matches = matcher.findOptimalMatches(studentProfile, tutorProfiles, subject, matchOptions);

        // If no matches meet threshold, still return top matches for admin analysis
        let resultsToReturn = matches;
        if (matches.length === 0 && isAdminRequest && tutorProfiles.length > 0) {
            // For admin, calculate all scores and return top matches even if below threshold
            const subjectsForMatch = (studentProfile.subjectsOfInterest && studentProfile.subjectsOfInterest.length > 0)
                ? studentProfile.subjectsOfInterest
                : (subject ? [subject] : []);
            const allScores = tutorProfiles.map(tutor => {
                const styleCompatibility = matcher._calculateStyleCompatibility(studentProfile, tutor);
                const subjectMatch = matcher._calculateSubjectMatch(subjectsForMatch, tutor.subjectExpertise, subject);
                const teachingAlignment = matcher._assessTeachingAlignment(studentProfile, tutor);
                const w = matcher.weights;
                const finalScore = (styleCompatibility * w.styleCompatibility + subjectMatch * w.subjectMatch + teachingAlignment * w.teachingAlignment);
                return {
                    tutor,
                    score: finalScore,
                    explanation: matcher.generateMatchingExplanation(studentProfile, tutor, finalScore),
                    breakdown: { styleCompatibility, subjectMatch, teachingAlignment }
                };
            });
            // Sort and take top matches
            allScores.sort((a, b) => b.score - a.score);
            resultsToReturn = allScores.slice(0, parseInt(limit));
        }

        // Limit results
        const limitedMatches = resultsToReturn.slice(0, parseInt(limit));

        // Format response
        const formattedMatches = limitedMatches.map(match => ({
            tutor: match.tutor.userData,
            compatibilityScore: match.score,
            explanation: match.explanation,
            breakdown: match.breakdown,
            ...(match.lowConfidence && { lowConfidence: true })
        }));

        console.log(`[findTutorMatches] Found ${formattedMatches.length} matches for student ${studentId || requestingUserId} (admin request: ${isAdminRequest})`);
        res.json({ tutors: formattedMatches });
    } catch (err) {
        console.error('[findTutorMatches] Error:', err.message);
        res.status(500).json({ message: 'Server error while finding tutor matches', error: err.message });
    }
};

/**
 * @desc    Get detailed compatibility analysis between tutor and student
 * @route   GET /api/matching/compatibility/:tutorId/:studentId
 * @access  Private
 */
const getCompatibilityAnalysis = async (req, res) => {
    try {
        const { tutorId, studentId } = req.params;
        const requestingUserId = req.user.id;

        // Verify both users exist
        const [tutor, student] = await Promise.all([
            User.findById(tutorId),
            User.findById(studentId || requestingUserId)
        ]);

        if (!tutor || !student) {
            return res.status(404).json({ message: 'Tutor or student not found' });
        }

        // Check authorization
        const isAuthorized = 
            studentId === requestingUserId ||
            studentId === requestingUserId.toString() ||
            req.user.role === 'admin' ||
            req.user.role === 'super_admin';

        if (!isAuthorized && studentId !== requestingUserId) {
            return res.status(403).json({ message: 'Not authorized to view this compatibility analysis' });
        }

        // Check if both have completed assessments
        if (!tutor.learningStyleProfile?.assessmentCompleted || !student.learningStyleProfile?.assessmentCompleted) {
            return res.status(400).json({ 
                message: 'Both tutor and student must complete assessments for compatibility analysis'
            });
        }

        // Build profiles
        const tutorProfile = new LearningStyleProfile(
            tutor.name,
            {
                visual_verbal: tutor.learningStyleProfile.dimensions.visual_verbal,
                sequential_global: tutor.learningStyleProfile.dimensions.sequential_global,
                active_reflective: tutor.learningStyleProfile.dimensions.active_reflective,
                structured_flexible: tutor.learningStyleProfile.dimensions.structured_flexible,
                teachingStrengths: tutor.learningStyleProfile.teachingStrengths || [],
                subjectExpertise: tutor.learningStyleProfile.subjectExpertise ? 
                    Object.fromEntries(tutor.learningStyleProfile.subjectExpertise) : {}
            }
        );

        const studentSubjectsOfInterest = student.studentProfile?.subjectOfFocus || [];
        const studentProfile = new LearningStyleProfile(
            student.name,
            {
                visual_verbal: student.learningStyleProfile.dimensions.visual_verbal,
                sequential_global: student.learningStyleProfile.dimensions.sequential_global,
                active_reflective: student.learningStyleProfile.dimensions.active_reflective,
                structured_flexible: student.learningStyleProfile.dimensions.structured_flexible,
                learningNeeds: student.learningStyleProfile.learningNeeds || [],
                subjectsOfInterest: studentSubjectsOfInterest
            }
        );

        // Calculate compatibility (use same formula as findOptimalMatches for consistency)
        const isAdminRequest = req.user.role === 'admin' || req.user.role === 'super_admin';
        const matcher = await getMatcher(isAdminRequest);

        const styleCompatibility = matcher._calculateStyleCompatibility(studentProfile, tutorProfile);
        const subjectMatch = matcher._calculateSubjectMatch(
            studentProfile.subjectsOfInterest,
            tutorProfile.subjectExpertise,
            null
        );
        const teachingAlignment = matcher._assessTeachingAlignment(studentProfile, tutorProfile);
        const w = matcher.weights;

        // Apply same scaling as findOptimalMatches (no availability/historical for single analysis)
        const scale = 1; // No availability or historical in single-tutor analysis
        let finalScore = (
            styleCompatibility * w.styleCompatibility * scale +
            subjectMatch * w.subjectMatch * scale +
            teachingAlignment * w.teachingAlignment * scale
        );

        // Phase 7: Historical score (aggregate avg, same as findOptimalMatches)
        const histAgg = await Booking.aggregate([
            { $match: { tutor: tutor._id, 'matchFeedback.actualRating': { $exists: true, $ne: null } } },
            { $group: { _id: null, avgRating: { $avg: '$matchFeedback.actualRating' } } }
        ]);
        const historicalScore = histAgg[0]?.avgRating ?? 0.5;
        const useHistorical = histAgg.length > 0;
        if (useHistorical) {
            finalScore = finalScore * 0.9 + historicalScore * 0.1;
        }

        // Phase 8: Profile completeness multiplier (must match findOptimalMatches)
        const confidence = Math.min(
            matcher._getProfileCompleteness(studentProfile, true),
            matcher._getProfileCompleteness(tutorProfile, false)
        );
        finalScore *= confidence;

        const explanation = matcher.generateMatchingExplanation(studentProfile, tutorProfile, finalScore);

        res.json({
            compatibilityScore: finalScore,
            explanation,
            breakdown: {
                styleCompatibility,
                subjectMatch,
                teachingAlignment
            },
            tutor: {
                _id: tutor._id,
                name: tutor.name,
                dimensions: tutor.learningStyleProfile.dimensions,
                teachingStrengths: tutor.learningStyleProfile.teachingStrengths
            },
            student: {
                _id: student._id,
                name: student.name,
                dimensions: student.learningStyleProfile.dimensions,
                learningNeeds: student.learningStyleProfile.learningNeeds
            }
        });
    } catch (err) {
        console.error('[getCompatibilityAnalysis] Error:', err.message);
        res.status(500).json({ message: 'Server error while calculating compatibility', error: err.message });
    }
};

/**
 * @desc    Record match feedback for continuous improvement
 * @route   POST /api/matching/feedback
 * @access  Private
 */
const recordMatchFeedback = async (req, res) => {
    try {
        const { bookingId, studentSatisfaction, tutorFeedback, sessionOutcome, progressMetrics } = req.body;
        const userId = req.user.id;

        if (!bookingId) {
            return res.status(400).json({ message: 'Booking ID is required' });
        }

        // Verify booking exists and user is involved
        const booking = await Booking.findById(bookingId)
            .populate('student', 'name')
            .populate('tutor', 'name');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify user is student, tutor, or admin
        const isAuthorized = 
            booking.student._id.toString() === userId ||
            booking.tutor?._id?.toString() === userId ||
            req.user.role === 'admin' ||
            req.user.role === 'super_admin';

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to provide feedback for this booking' });
        }

        // Get predicted score from booking if available (would need to store this when booking is created)
        // For now, calculate it on the fly
        let predictedScore = null;
        let storedBreakdown = null;
        if (booking.student && booking.tutor) {
            const [student, tutor] = await Promise.all([
                User.findById(booking.student._id).select('learningStyleProfile studentProfile'),
                User.findById(booking.tutor._id).select('learningStyleProfile tutorInfo')
            ]);

            if (student?.learningStyleProfile?.assessmentCompleted && tutor?.learningStyleProfile?.assessmentCompleted) {
                const studentSubjectsOfInterest = [...(student.studentProfile?.subjectOfFocus || [])];
                if (booking.subject && !studentSubjectsOfInterest.includes(booking.subject)) {
                    studentSubjectsOfInterest.push(booking.subject);
                }
                const studentProfile = new LearningStyleProfile(student.name, {
                    visual_verbal: student.learningStyleProfile.dimensions.visual_verbal,
                    sequential_global: student.learningStyleProfile.dimensions.sequential_global,
                    active_reflective: student.learningStyleProfile.dimensions.active_reflective,
                    structured_flexible: student.learningStyleProfile.dimensions.structured_flexible,
                    learningNeeds: student.learningStyleProfile.learningNeeds || [],
                    subjectsOfInterest: studentSubjectsOfInterest
                });

                const tutorProfile = new LearningStyleProfile(tutor.name, {
                    visual_verbal: tutor.learningStyleProfile.dimensions.visual_verbal,
                    sequential_global: tutor.learningStyleProfile.dimensions.sequential_global,
                    active_reflective: tutor.learningStyleProfile.dimensions.active_reflective,
                    structured_flexible: tutor.learningStyleProfile.dimensions.structured_flexible,
                    teachingStrengths: tutor.learningStyleProfile.teachingStrengths || [],
                    subjectExpertise: tutor.learningStyleProfile.subjectExpertise ? 
                        Object.fromEntries(tutor.learningStyleProfile.subjectExpertise) : {}
                });
                // Fallback: derive subjectExpertise from tutorInfo.subjects when empty
                if (Object.keys(tutorProfile.subjectExpertise).length === 0 && tutor.tutorInfo?.subjects?.length > 0) {
                    tutor.tutorInfo.subjects.forEach(s => {
                        tutorProfile.subjectExpertise[s] = 5;
                    });
                }

                // Create matcher instance for calculations
                const isAdminRequest = req.user.role === 'admin' || req.user.role === 'super_admin';
                const matcher = await getMatcher(isAdminRequest);
                
                const styleCompatibility = matcher._calculateStyleCompatibility(studentProfile, tutorProfile);
                const subjectMatch = matcher._calculateSubjectMatch(
                    studentProfile.subjectsOfInterest,
                    tutorProfile.subjectExpertise,
                    booking.subject
                );
                const teachingAlignment = matcher._assessTeachingAlignment(studentProfile, tutorProfile);
                const w = matcher.weights;
                predictedScore = (styleCompatibility * w.styleCompatibility + subjectMatch * w.subjectMatch + teachingAlignment * w.teachingAlignment);
                storedBreakdown = { styleCompatibility, subjectMatch, teachingAlignment };
            }
        }

        // Store feedback in booking
        // For now, we can create a MatchFeedback document if the model exists
        // Or store it in the booking itself
        booking.matchFeedback = {
            studentSatisfaction: studentSatisfaction || null,
            tutorFeedback: tutorFeedback || null,
            sessionOutcome: sessionOutcome || null,
            progressMetrics: progressMetrics || null,
            predictedScore: predictedScore,
            actualRating: studentSatisfaction ? (studentSatisfaction - 1) / 4 : null, // Normalize 1-5 to 0-1
            breakdown: storedBreakdown,
            feedbackDate: new Date(),
            feedbackBy: userId
        };

        await booking.save();

        console.log(`[recordMatchFeedback] Feedback recorded for booking ${bookingId}`);
        res.json({ 
            message: 'Feedback recorded successfully',
            feedback: booking.matchFeedback
        });
    } catch (err) {
        console.error('[recordMatchFeedback] Error:', err.message);
        res.status(500).json({ message: 'Server error while recording feedback', error: err.message });
    }
};

/**
 * @desc    Get matching analytics for admin
 * @route   GET /api/matching/analytics
 * @access  Private (Admin only)
 */
const getMatchingAnalytics = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Get all bookings with feedback
        const bookings = await Booking.find({
            'matchFeedback.feedbackDate': { $exists: true }
        })
        .populate('student', 'name')
        .populate('tutor', 'name')
        .select('matchFeedback student tutor subject sessionDate');

        const feedbackData = bookings
            .filter(b => b.matchFeedback && b.matchFeedback.predictedScore !== null && b.matchFeedback.actualRating !== null)
            .map(b => ({
                predictedScore: b.matchFeedback.predictedScore,
                actualRating: b.matchFeedback.actualRating,
                breakdown: b.matchFeedback.breakdown
            }));

        // Create matcher instance for analytics
        const matcher = await getMatcher(true); // Admin request, use lower threshold
        const accuracy = matcher.calculateMatchAccuracy(feedbackData);
        const optimizedWeights = matcher.updateMatchingWeights(feedbackData);

        res.json({
            totalFeedbackEntries: feedbackData.length,
            accuracy: accuracy.accuracy,
            averageError: accuracy.averageError,
            sampleSize: accuracy.sampleSize,
            optimizedWeights,
            recentFeedback: bookings
                .filter(b => b.matchFeedback)
                .slice(-10)
                .map(b => ({
                    bookingId: b._id,
                    student: b.student?.name,
                    tutor: b.tutor?.name,
                    subject: b.subject,
                    predictedScore: b.matchFeedback.predictedScore,
                    actualRating: b.matchFeedback.actualRating,
                    sessionOutcome: b.matchFeedback.sessionOutcome
                }))
        });
    } catch (err) {
        console.error('[getMatchingAnalytics] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching analytics', error: err.message });
    }
};

/**
 * @desc    Run weight optimization from feedback and persist to SystemConfig
 * @route   POST /api/matching/optimize-weights
 * @access  Private (Admin only)
 */
const optimizeMatchingWeights = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const bookings = await Booking.find({
            'matchFeedback.feedbackDate': { $exists: true }
        }).select('matchFeedback');

        const feedbackData = bookings
            .filter(b => b.matchFeedback && b.matchFeedback.predictedScore !== null && b.matchFeedback.actualRating !== null)
            .map(b => ({
                predictedScore: b.matchFeedback.predictedScore,
                actualRating: b.matchFeedback.actualRating,
                breakdown: b.matchFeedback.breakdown
            }));

        const matcher = new LearningStyleMatcher(0.5, null);
        const optimizedWeights = matcher.updateMatchingWeights(feedbackData);

        const config = await SystemConfig.getConfig();
        config.matchingWeights = {
            styleCompatibility: optimizedWeights.styleCompatibility,
            subjectMatch: optimizedWeights.subjectMatch,
            teachingAlignment: optimizedWeights.teachingAlignment,
        };
        config.lastUpdatedBy = req.user.id;
        await config.save();

        console.log(`[optimizeMatchingWeights] Weights updated by admin: ${req.user.id}`, optimizedWeights);
        res.json({
            message: 'Matching weights optimized and persisted',
            matchingWeights: optimizedWeights,
            feedbackEntriesUsed: feedbackData.length
        });
    } catch (err) {
        console.error('[optimizeMatchingWeights] Error:', err.message);
        res.status(500).json({ message: 'Server error while optimizing weights', error: err.message });
    }
};

module.exports = {
    findTutorMatches,
    getCompatibilityAnalysis,
    recordMatchFeedback,
    getMatchingAnalytics,
    optimizeMatchingWeights
};

