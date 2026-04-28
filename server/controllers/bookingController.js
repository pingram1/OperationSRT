const Booking = require('../models/Booking');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const { autoCheckAchievements } = require('./achievementController');
const { LearningStyleProfile, LearningStyleMatcher } = require('../utils/matchingUtils');
const { createRoom } = require('../services/wherebyService');
const { createNoShowNotifications, createSessionRequestedNotification } = require('../services/bookingNotificationService');
const logger = require('../utils/logger');
const { creditTutoringSession } = require('../services/scholarshipService');
const MembershipPlan = require('../models/MembershipPlan');
const { computeMembershipTotalUsd } = require('../utils/membershipPrice');
const { validateSessionConfigForPlan } = require('./membershipController');
const { trackEvent } = require('../services/telemetryService');

function mapCancellationReasonEnum(raw) {
    if (raw == null || typeof raw !== 'string' || !raw.trim()) return 'unspecified';
    const s = raw.trim().toLowerCase();
    if (s.includes('schedule') || s.includes('conflict')) return 'schedule_conflict';
    if (s.includes('financial') || s.includes('money') || s.includes('cost')) return 'financial';
    if (s.includes('no longer') || s.includes('don\'t need') || s.includes('dont need')) return 'no_longer_needed';
    return 'other';
}

function cancelledByTelemetryRole(role) {
    if (role === 'student') return 'student';
    if (role === 'parent') return 'parent';
    if (role === 'tutor') return 'tutor';
    if (role === 'admin' || role === 'super_admin') return 'admin';
    return 'unknown';
}

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res) => {
    const {
        student,
        tutor,
        subject,
        gradeLevel,
        goals,
        sessionDate,
        duration,
        serviceType,
        sessionType = 'in-person',
        price,
        paymentPurpose: rawPaymentPurpose,
        membershipPlanId,
        membershipSessionConfiguration,
    } = req.body;

    try {
        // The person making the booking is the logged-in user
        const user = req.user.id;
        const userRole = req.user.role;
        const requestedStudentId = student ? student.toString() : null;

        if (!requestedStudentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        // RBAC: Students can only book for themselves
        if (userRole === 'student' && requestedStudentId !== user.toString()) {
            return res.status(403).json({ message: 'Students can only create bookings for themselves' });
        }

        // RBAC: Parents can only book for children linked to their account
        if (userRole === 'parent') {
            const parentUser = await User.findById(user).select('children');
            if (!parentUser) {
                return res.status(404).json({ message: 'Parent user not found' });
            }

            const childIds = (parentUser.children || []).map((child) => (child._id || child).toString());
            if (!childIds.includes(requestedStudentId)) {
                return res.status(403).json({ message: 'You are not authorized to create bookings for this student' });
            }
        }

        // RBAC: Admin and super_admin bypass student ownership checks
        if (userRole !== 'student' && userRole !== 'parent' && userRole !== 'admin' && userRole !== 'super_admin') {
            return res.status(403).json({ message: 'You are not authorized to create bookings' });
        }

        const paymentPurpose = rawPaymentPurpose === 'membership' ? 'membership' : 'session';
        let resolvedPrice = null;
        let resolvedMembershipPlanId = null;
        let resolvedMembershipSessionConfiguration = null;

        if (paymentPurpose === 'membership') {
            if (!membershipPlanId) {
                return res.status(400).json({ message: 'membershipPlanId is required for membership bookings' });
            }
            const mPlan = await MembershipPlan.findById(membershipPlanId);
            if (!mPlan || !mPlan.isActive) {
                return res.status(400).json({ message: 'Invalid or inactive membership plan' });
            }
            const cfgErr = validateSessionConfigForPlan(mPlan, membershipSessionConfiguration);
            if (cfgErr) {
                return res.status(400).json({ message: cfgErr });
            }
            resolvedPrice = computeMembershipTotalUsd(mPlan, membershipSessionConfiguration);
            resolvedMembershipPlanId = mPlan._id;
            resolvedMembershipSessionConfiguration = membershipSessionConfiguration || null;
        } else {
            const raw = price != null ? Number(price) : NaN;
            if (Number.isFinite(raw) && raw >= 0) {
                resolvedPrice = Math.round(raw * 100) / 100;
            } else {
                const servicePrices = { solo: 65, group: 229.99, consult: 0 };
                resolvedPrice = servicePrices[serviceType] ?? 65;
            }
        }
        
        logger.info('Creating booking', { student, user });

        // Validate subject against system config
        if (subject) {
            const config = await SystemConfig.getConfig();
            const validSubjects = config.subjects || [];
            if (!validSubjects.includes(subject)) {
                return res.status(400).json({ 
                    message: `Invalid subject. Available subjects are: ${validSubjects.join(', ')}` 
                });
            }
        }

        // Auto-assign best match if tutor is null and student has completed assessment
        let assignedTutor = tutor;
        if (!tutor) {
            const studentUser = await User.findById(student).select('learningStyleProfile studentProfile');
            if (studentUser?.learningStyleProfile?.assessmentCompleted) {
                try {
                    const config = await SystemConfig.getConfig();
                    const mw = config.matchingWeights;
                    const weights = (mw && mw.styleCompatibility != null && mw.subjectMatch != null && mw.teachingAlignment != null)
                        ? { styleCompatibility: mw.styleCompatibility, subjectMatch: mw.subjectMatch, teachingAlignment: mw.teachingAlignment }
                        : null;
                    const matcher = new LearningStyleMatcher(0.75, weights);
                    const subjectsOfInterest = [...(studentUser.studentProfile?.subjectOfFocus || [])];
                    if (subject && !subjectsOfInterest.includes(subject)) {
                        subjectsOfInterest.push(subject);
                    }
                    // Build student profile
                    const studentProfile = new LearningStyleProfile(
                        studentUser.name,
                        {
                            visual_verbal: studentUser.learningStyleProfile.dimensions.visual_verbal,
                            sequential_global: studentUser.learningStyleProfile.dimensions.sequential_global,
                            active_reflective: studentUser.learningStyleProfile.dimensions.active_reflective,
                            structured_flexible: studentUser.learningStyleProfile.dimensions.structured_flexible,
                            learningNeeds: studentUser.learningStyleProfile.learningNeeds || [],
                            subjectsOfInterest
                        }
                    );

                    // Find available tutors
                    const tutorQuery = {
                        $or: [
                            { role: 'tutor', 'tutorInfo.status': 'active' },
                            { role: 'super_admin', availableAsTutor: true }
                        ],
                        'learningStyleProfile.assessmentCompleted': true
                    };

                    if (subject) {
                        tutorQuery['tutorInfo.subjects'] = subject;
                    }

                    const tutorUsers = await User.find(tutorQuery)
                        .select('name email avatar role tutorInfo learningStyleProfile availableAsTutor');

                    // Convert to profiles
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
                        if (Object.keys(profile.subjectExpertise).length === 0 && tutorUser.tutorInfo?.subjects?.length > 0) {
                            tutorUser.tutorInfo.subjects.forEach(s => {
                                profile.subjectExpertise[s] = 5;
                            });
                        }
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

                    // Phase 7: Historical ratings for ranking
                    const feedbackAgg = await Booking.aggregate([
                        { $match: { tutor: { $in: tutorUsers.map(u => u._id) }, 'matchFeedback.actualRating': { $exists: true, $ne: null } } },
                        { $group: { _id: '$tutor', avgRating: { $avg: '$matchFeedback.actualRating' } } }
                    ]);
                    const tutorHistoricalScores = {};
                    feedbackAgg.forEach(row => { tutorHistoricalScores[String(row._id)] = row.avgRating; });

                    // Find best match
                    const matches = matcher.findOptimalMatches(studentProfile, tutorProfiles, subject, {
                        tutorHistoricalScores: Object.keys(tutorHistoricalScores).length > 0 ? tutorHistoricalScores : undefined
                    });
                    if (matches.length > 0) {
                        assignedTutor = matches[0].tutor.userData._id;
                        logger.info('Auto-assigned tutor', { tutorId: assignedTutor, matchScore: (matches[0].score * 100).toFixed(0) });
                    }
                } catch (matchErr) {
                    logger.error('Error in auto-matching', { error: matchErr.message });
                    // Continue without auto-assignment if matching fails
                }
            }
        }

        // Create Whereby room if session is virtual
        let wherebyRoomInfo = null;
        if (sessionType === 'virtual') {
            try {
                const sessionStart = new Date(sessionDate);
                const sessionEnd = new Date(sessionStart.getTime() + duration * 60 * 1000); // duration is in minutes
                
                // Create room with booking ID for reference
                wherebyRoomInfo = await createRoom({
                    startDate: sessionStart,
                    endDate: sessionEnd,
                    bookingId: null, // Will be set after booking is created
                });
                
                logger.info('Whereby room created', { 
                    meetingId: wherebyRoomInfo.meetingId,
                    roomUrl: wherebyRoomInfo.roomUrl,
                    hasHostUrl: !!wherebyRoomInfo.hostRoomUrl
                });
            } catch (wherebyError) {
                logger.error('Failed to create Whereby room', { error: wherebyError.message });
                // Continue with booking creation even if room creation fails
                // The booking will be created without a room, and admin can handle it
            }
        }

        // Check if student can make payments
        // Find parent(s) linked to this student
        const studentUser = await User.findById(student);
        let canMakePayments = true; // Default to true
        let parentForPayment = null;

        if (studentUser && studentUser.role === 'student') {
            // Find parents who have this student in their children array
            const parents = await User.find({
                role: 'parent',
                children: student
            });

            if (parents.length > 0) {
                // Check payment permission from first parent (assuming one primary parent)
                // In the future, we could allow multiple parents and check all
                const parent = parents[0];
                parentForPayment = parent._id;

                if (parent.studentPaymentSettings) {
                    const studentIdStr = student.toString();
                    let paymentSetting = null;

                    // Handle Map type
                    if (parent.studentPaymentSettings instanceof Map) {
                        paymentSetting = parent.studentPaymentSettings.get(studentIdStr);
                    } else if (typeof parent.studentPaymentSettings === 'object') {
                        paymentSetting = parent.studentPaymentSettings[studentIdStr];
                    }

                    // If setting exists and explicitly set to false, student cannot pay
                    if (paymentSetting && paymentSetting.canMakePayments === false) {
                        canMakePayments = false;
                    }
                }
            }
        }

        // Prepare booking data
        const bookingData = {
            user,
            student,
            tutor: assignedTutor || null,
            subject,
            gradeLevel: gradeLevel || null,
            goals,
            sessionDate,
            duration,
            serviceType,
            sessionType,
            price: resolvedPrice,
            paymentPurpose,
            membershipPlanId: resolvedMembershipPlanId,
            membershipSessionConfiguration: resolvedMembershipSessionConfiguration,
            membershipActivationComplete: false,
            status: 'scheduled',
            tutorAcceptanceStatus: assignedTutor ? 'pending' : null,
            wherebyRoom: wherebyRoomInfo ? {
                meetingId: wherebyRoomInfo.meetingId,
                roomId: wherebyRoomInfo.roomId || wherebyRoomInfo.meetingId, // For backward compatibility
                roomUrl: wherebyRoomInfo.roomUrl,
                hostRoomUrl: wherebyRoomInfo.hostRoomUrl,
                createdAt: wherebyRoomInfo.createdAt || new Date(),
            } : undefined,
        };

        // If student cannot make payments and there's a parent, set up payment request
        if (!canMakePayments && parentForPayment && serviceType !== 'consult') {
            // Calculate price if not provided (fallback to service type defaults)
            let sessionPrice = resolvedPrice;
            if (!sessionPrice || sessionPrice === 0) {
                // Default prices based on service type
                const servicePrices = {
                    'solo': 65,
                    'group': 229.99,
                    'consult': 0
                };
                sessionPrice = servicePrices[serviceType] || 65;
            }
            
            bookingData.customerPayment = {
                status: 'requested',
                amount: sessionPrice,
                currency: 'USD',
                paymentRequest: {
                    requestedAt: new Date(),
                    requestedFrom: parentForPayment,
                    parentNotified: false, // Will be set to true when notification is sent
                }
            };
            logger.info('Payment request created for parent', { bookingId: bookingData._id, parentId: parentForPayment, amount: sessionPrice });
        }

        const newBooking = new Booking(bookingData);

        const booking = await newBooking.save();
        
        // Update room with actual booking ID if room was created
        if (wherebyRoomInfo && booking.wherebyRoom) {
            // Room name already includes timestamp, so we don't need to update it
            // But we could update the room metadata if Whereby API supports it
            logger.info('Room linked to booking', { bookingId: booking._id });
        }
        
        // Populate before returning
        await booking.populate('user', 'name email avatar role');
        await booking.populate('student', 'name email avatar role');
        await booking.populate('tutor', 'name email avatar role');

        if (booking.tutor && booking.tutorAcceptanceStatus === 'pending') {
            createSessionRequestedNotification(booking).catch(e => logger.error('Failed to create session-requested notification', e));
        }
        
        logger.info('Booking created successfully', { bookingId: booking._id });

        trackEvent(
            'booking_created',
            { serviceType, durationMin: duration },
            {
                actorUserId: user,
                subjectStudentId: requestedStudentId,
                bookingId: booking._id,
                schoolId: studentUser?.schoolId,
            }
        ).catch(() => {});

        if (booking.customerPayment?.status === 'requested' && parentForPayment) {
            trackEvent(
                'guardian_payment_requested',
                {
                    amountUsd: booking.customerPayment.amount,
                    currency: booking.customerPayment.currency || 'USD',
                    requestedFromGuardianUserId: parentForPayment.toString(),
                },
                {
                    actorUserId: user,
                    subjectStudentId: requestedStudentId,
                    bookingId: booking._id,
                    schoolId: studentUser?.schoolId,
                },
            ).catch(() => {});
        }

        if (booking.sessionType === 'virtual' && booking.wherebyRoom?.roomUrl) {
            trackEvent(
                'virtual_session_joined',
                {
                    surface: 'booking_flow_virtual_room_provisioned',
                    participantRole: 'unknown',
                },
                {
                    actorUserId: user,
                    subjectStudentId: requestedStudentId,
                    bookingId: booking._id,
                    schoolId: studentUser?.schoolId,
                },
            ).catch(() => {});
        }

        res.status(201).json(booking);

    } catch (err) {
        logger.error('Error creating booking', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'Server error while creating booking' });
    }
};

/**
 * @desc    Get all bookings for the logged-in user
 * @route   GET /api/bookings
 * @access  Private
 */
const getUserBookings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find bookings where:
        // 1. The logged-in user is the one who created the booking (user field), OR
        // 2. The logged-in user is the student the booking is for (student field), OR
        // 3. The logged-in user is the tutor assigned to the booking (tutor field), OR
        // 4. For parents: bookings where any of their children are the student
        let query = {
            $or: [
                { user: req.user.id },
                { student: req.user.id },
                { tutor: req.user.id }
            ]
        };

        // If user is a parent, also include bookings for their children
        if (user.role === 'parent' && user.children && user.children.length > 0) {
            query.$or.push({ student: { $in: user.children } });
        }

        // Pagination
        const { page = 1, limit = 50 } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 50, 100); // Max 100 per page
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await Booking.countDocuments(query);
        
        const bookings = await Booking.find(query)
            .populate('user', 'name email avatar role') // Populate with user's info
            .populate('student', 'name email avatar role') // Populate with student's info
            .populate('tutor', 'name email avatar role')  // Populate with tutor's info
            .sort({ sessionDate: 1 }) // Sort by session date ascending
            .skip(skip)
            .limit(limitNum);

        logger.info('Found user bookings', { userId: req.user.id, role: user.role, count: bookings.length });
        res.json({
            bookings: bookings || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        logger.error('Error fetching user bookings', { error: err.message, userId: req.user.id });
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

/**
 * @desc    Get all bookings (Admin only)
 * @route   GET /api/bookings/all
 * @access  Private (Admin only)
 */
const getAllBookings = async (req, res) => {
    try {
        logger.info('Get all bookings request', { userId: req.user.id });
        
        // Check if user is admin or super_admin
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            logger.warn('Access denied to getAllBookings', { userId: req.user.id, role: user?.role });
            return res.status(403).json({ message: 'Only administrators can view all bookings' });
        }

        const { status, student, tutor, subject, startDate, endDate, paymentStatus, page = 1, limit = 50 } = req.query;
        logger.debug('Get all bookings query params', { status, student, tutor, subject, startDate, endDate, paymentStatus, page, limit });
        
        // Build query
        const query = {};
        if (status) query.status = status;
        if (student) query.student = student;
        if (tutor) query.tutor = tutor;
        if (subject) query.subject = subject;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (startDate || endDate) {
            query.sessionDate = {};
            if (startDate) query.sessionDate.$gte = new Date(startDate);
            if (endDate) query.sessionDate.$lte = new Date(endDate);
        }

        // Pagination
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 50, 100); // Max 100 per page
        const skip = (pageNum - 1) * limitNum;

        logger.debug('MongoDB query for getAllBookings', { query: JSON.stringify(query) });
        
        // Get total count for pagination metadata
        const total = await Booking.countDocuments(query);
        
        const bookings = await Booking.find(query)
            .populate('user', 'name email avatar role')
            .populate('student', 'name email avatar role')
            .populate('tutor', 'name email avatar role')
            .sort({ sessionDate: -1 })
            .skip(skip)
            .limit(limitNum);

        logger.info('Found bookings', { count: bookings.length, page: pageNum, totalPages: Math.ceil(total / limitNum) });
        
        // Return paginated response
        res.json({
            bookings: bookings || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        logger.error('Error fetching all bookings', { error: err.message, stack: err.stack });
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

/**
 * @desc    Update a booking (Admin only)
 * @route   PUT /api/bookings/:id
 * @access  Private (Admin only)
 */
const updateBooking = async (req, res) => {
    try {
        // Check if user is admin
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can update bookings' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const prevSessionMs = booking.sessionDate ? new Date(booking.sessionDate).getTime() : null;

        // Update booking fields
        const { student, tutor, subject, goals, sessionDate, duration, serviceType, status } = req.body;
        
        // Validate subject against system config if provided
        if (subject) {
            const config = await SystemConfig.getConfig();
            const validSubjects = config.subjects || [];
            if (!validSubjects.includes(subject)) {
                return res.status(400).json({ 
                    message: `Invalid subject. Available subjects are: ${validSubjects.join(', ')}` 
                });
            }
        }
        
        if (student) booking.student = student;
        let tutorJustAssigned = false;
        let sessionRescheduled = false;
        let previousScheduledStartIso = null;
        if (tutor !== undefined) {
            const previousTutorId = booking.tutor ? booking.tutor.toString() : null;
            booking.tutor = tutor; // Allow null
            // If tutor is being assigned/changed, reset acceptance status
            if (tutor) {
                const newTutorId = tutor.toString();
                // New tutor assigned or tutor changed - set to pending
                if (!previousTutorId || previousTutorId !== newTutorId) {
                    booking.tutorAcceptanceStatus = 'pending';
                    tutorJustAssigned = true;
                }
            } else {
                // Tutor removed - clear acceptance status
                booking.tutorAcceptanceStatus = null;
            }
        }
        if (subject) booking.subject = subject;
        if (goals) booking.goals = goals;
        if (sessionDate !== undefined && sessionDate !== null && sessionDate !== '') {
            const nextDate = new Date(sessionDate);
            if (prevSessionMs !== nextDate.getTime()) {
                sessionRescheduled = true;
                previousScheduledStartIso = booking.sessionDate
                    ? new Date(booking.sessionDate).toISOString()
                    : null;
            }
            booking.sessionDate = nextDate;
        }
        if (duration) booking.duration = duration;
        if (serviceType) booking.serviceType = serviceType;
        if (status) booking.status = status;

        await booking.save();

        if (sessionRescheduled && booking.sessionDate) {
            await booking.populate('student', 'schoolId');
            const deltaMs = previousScheduledStartIso
                ? booking.sessionDate.getTime() - new Date(previousScheduledStartIso).getTime()
                : null;
            trackEvent(
                'booking_rescheduled',
                {
                    previousScheduledStartAt: previousScheduledStartIso,
                    newScheduledStartAt: booking.sessionDate.toISOString(),
                    deltaHours: deltaMs != null ? deltaMs / (1000 * 60 * 60) : null,
                },
                {
                    actorUserId: req.user.id,
                    subjectStudentId: booking.student._id || booking.student,
                    bookingId: booking._id,
                    schoolId: booking.student.schoolId,
                },
            ).catch(() => {});
        }

        if (tutorJustAssigned && booking.tutor && booking.tutorAcceptanceStatus === 'pending') {
            createSessionRequestedNotification(booking).catch(e => logger.error('Failed to create session-requested notification', e));
        }

        // Populate before returning
        await booking.populate('user', 'name email');
        await booking.populate('student', 'name email avatar');
        await booking.populate('tutor', 'name email avatar');

        res.json(booking);
    } catch (err) {
        logger.error('Error updating booking', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while updating booking' });
    }
};

/**
 * @desc    Cancel a booking
 * @route   DELETE /api/bookings/:id
 * @access  Private
 */
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('user', 'name email role')
            .populate('student', 'name email role schoolId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if booking is already cancelled or completed
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }
        if (booking.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed booking' });
        }

        // Check authorization - allow students, parents, admins, and booking owner
        const user = await User.findById(req.user.id);
        const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
        const isOwner = booking.user._id.toString() === req.user.id;
        const isStudent = booking.student._id.toString() === req.user.id;
        const isParent = user && user.role === 'parent' && booking.user._id.toString() === req.user.id;

        if (!isAdmin && !isOwner && !isStudent && !isParent) {
            return res.status(403).json({ message: 'You are not authorized to cancel this booking' });
        }

        // Check if cancellation is 24+ hours before session
        const sessionDate = new Date(booking.sessionDate);
        const now = new Date();
        const hoursUntilSession = (sessionDate - now) / (1000 * 60 * 60); // Convert to hours

        let hasPenalty = false;
        let penaltyAmount = null;

        // For students and parents: penalty-free if cancelled 24+ hours before
        // Admins can always cancel without penalty
        if ((isStudent || isParent || isOwner) && !isAdmin) {
            if (hoursUntilSession < 24) {
                // Less than 24 hours - cancellation has penalty
                hasPenalty = true;
                // Calculate penalty (could be full amount or partial - adjust as needed)
                // For now, we'll just flag it and let the admin handle the penalty
                penaltyAmount = booking.customerPayment?.amount || null;
            }
        }

        // Update booking status and cancellation info
        booking.status = 'cancelled';
        booking.cancellation = {
            cancelledAt: new Date(),
            cancelledBy: req.user.id,
            cancellationReason: req.body.reason || null,
            hasPenalty: hasPenalty,
            penaltyAmount: penaltyAmount,
        };

        await booking.save();

        // Populate cancellation info for response
        await booking.populate('cancellation.cancelledBy', 'name email');

        const message = hasPenalty 
            ? 'Booking cancelled. Note: Cancellation is less than 24 hours before the session, so a penalty may apply. Please contact support for details.'
            : 'Booking cancelled successfully with no penalty (cancelled 24+ hours before session).';

        logger.info('Booking cancelled', { bookingId: booking._id, userId: req.user.id, hasPenalty });

        trackEvent(
            'booking_cancelled',
            {
                cancellationReasonEnum: mapCancellationReasonEnum(req.body.reason),
                hoursBeforeStart: hoursUntilSession,
                cancelledByRole: cancelledByTelemetryRole(req.user.role),
            },
            {
                actorUserId: req.user.id,
                subjectStudentId: booking.student._id || booking.student,
                bookingId: booking._id,
                schoolId: booking.student.schoolId,
            },
        ).catch(() => {});

        res.json({ 
            message,
            booking,
            hasPenalty,
            penaltyAmount,
        });
    } catch (err) {
        logger.error('Error cancelling booking', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while cancelling booking' });
    }
};

/**
 * @desc    Delete a booking (Admin only - hard delete)
 * @route   DELETE /api/bookings/:id/delete
 * @access  Private (Admin only)
 */
const deleteBooking = async (req, res) => {
    try {
        // Check if user is admin
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can delete bookings' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        await Booking.findByIdAndDelete(req.params.id);
        logger.info('Booking deleted', { bookingId: req.params.id, adminId: req.user.id });
        res.json({ message: 'Booking successfully deleted' });
    } catch (err) {
        logger.error('Error deleting booking', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while deleting booking' });
    }
};

/**
 * @desc    Get all bookings for a tutor
 * @route   GET /api/bookings/tutor
 * @access  Private (Tutor)
 */
const getTutorBookings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can access this endpoint' });
        }

        const { status, startDate, endDate } = req.query;
        const query = { tutor: req.user.id };
        
        if (status) query.status = status;
        if (startDate || endDate) {
            query.sessionDate = {};
            if (startDate) query.sessionDate.$gte = new Date(startDate);
            if (endDate) query.sessionDate.$lte = new Date(endDate);
        }

        const bookings = await Booking.find(query)
            .populate('user', 'name email avatar role')
            .populate('student', 'name email avatar role studentProfile')
            .sort({ sessionDate: -1 });

        logger.info('Found tutor bookings', { tutorId: req.user.id, count: bookings.length });
        res.json(bookings);
    } catch (err) {
        logger.error('Error fetching tutor bookings', { error: err.message, tutorId: req.user.id });
        res.status(500).json({ message: 'Server error while fetching tutor bookings' });
    }
};

/**
 * @desc    Accept a booking (Tutor only)
 * @route   PUT /api/bookings/:id/accept
 * @access  Private (Tutor)
 */
const acceptBooking = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can accept bookings' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if the booking is already assigned to a different tutor
        if (booking.tutor && booking.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'This booking is already assigned to another tutor' });
        }

        // Assign tutor if not already assigned (for consultations or unassigned bookings)
        if (!booking.tutor) {
            booking.tutor = req.user.id;
        }

        // Mark as accepted by the tutor
        booking.tutorAcceptanceStatus = 'accepted';
        // Ensure status is scheduled (accepting a booking)
        booking.status = 'scheduled';
        await booking.save();

        await booking.populate('user', 'name email avatar');
        await booking.populate('student', 'name email avatar schoolId');
        await booking.populate('tutor', 'name email avatar');

        const latencyMsSinceCreated = booking.createdAt
            ? Date.now() - new Date(booking.createdAt).getTime()
            : null;

        logger.info('Booking accepted', { bookingId: req.params.id, tutorId: req.user.id });

        trackEvent(
            'tutor_booking_accepted',
            { latencyMsSinceCreated },
            {
                actorUserId: req.user.id,
                subjectStudentId: booking.student._id || booking.student,
                bookingId: booking._id,
                schoolId: booking.student.schoolId,
            },
        ).catch(() => {});

        res.json({ message: 'Booking accepted successfully', booking });
    } catch (err) {
        logger.error('Error accepting booking', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while accepting booking' });
    }
};

/**
 * @desc    Decline a booking (Tutor only)
 * @route   PUT /api/bookings/:id/decline
 * @access  Private (Tutor)
 */
const declineBooking = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can decline bookings' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if the booking is assigned to this tutor
        if (booking.tutor && booking.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'This booking is not assigned to you' });
        }

        // Mark as declined by the tutor
        booking.tutorAcceptanceStatus = 'declined';
        await booking.save();

        await booking.populate('user', 'name email avatar');
        await booking.populate('student', 'name email avatar schoolId');
        await booking.populate('tutor', 'name email avatar');

        logger.info('Booking declined', { bookingId: req.params.id, tutorId: req.user.id });

        trackEvent(
            'tutor_booking_declined',
            {},
            {
                actorUserId: req.user.id,
                subjectStudentId: booking.student._id || booking.student,
                bookingId: booking._id,
                schoolId: booking.student.schoolId,
            },
        ).catch(() => {});

        res.json({ message: 'Booking declined successfully', booking });
    } catch (err) {
        logger.error('Error declining booking', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while declining booking' });
    }
};

/**
 * @desc    Mark a booking as completed (Tutor only)
 * @route   PUT /api/bookings/:id/complete
 * @access  Private (Tutor)
 */
const completeBooking = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can mark bookings as complete' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if the booking is assigned to this tutor
        if (!booking.tutor || booking.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'This booking is not assigned to you' });
        }

        booking.status = 'completed';
        // When tutor marks as complete, payment status remains 'Unpaid' until admin marks it as paid
        booking.paymentStatus = 'Unpaid';
        await booking.save();

        await booking.populate('user', 'name email avatar');
        await booking.populate('student', 'name email avatar schoolId');
        await booking.populate('tutor', 'name email avatar');

        const markedAt = new Date();
        const scheduledEndMs = booking.sessionDate && booking.duration
            ? new Date(booking.sessionDate).getTime() + booking.duration * 60 * 1000
            : null;
        const scheduledVsActualLatencyMin = scheduledEndMs != null
            ? (markedAt.getTime() - scheduledEndMs) / (1000 * 60)
            : null;

        trackEvent(
            'tutoring_session_completed',
            {
                scheduledDurationMin: booking.duration,
                actualMarkedCompleteAt: markedAt.toISOString(),
                scheduledVsActualLatencyMin,
            },
            {
                actorUserId: req.user.id,
                subjectStudentId: booking.student._id || booking.student,
                bookingId: booking._id,
                schoolId: booking.student.schoolId,
            },
        ).catch(() => {});

        // Auto-check achievements for the student
        if (booking.student) {
            try {
                const awardedAchievements = await autoCheckAchievements(booking.student._id || booking.student);
                if (awardedAchievements && awardedAchievements.length > 0) {
                    logger.info('Achievements awarded', { studentId: booking.student._id || booking.student, count: awardedAchievements.length });
                }
            } catch (err) {
                logger.error('Error checking achievements', { error: err.message, bookingId: req.params.id });
                // Don't fail the request if achievement check fails
            }
            try {
                const sid = booking.student._id || booking.student;
                await creditTutoringSession(sid, booking._id);
            } catch (schErr) {
                logger.error('Scholarship tutoring credit failed', { error: schErr.message, bookingId: req.params.id });
            }
        }

        logger.info('Booking marked as complete', { bookingId: req.params.id, tutorId: req.user.id });
        res.json({ message: 'Booking marked as complete', booking });
    } catch (err) {
        logger.error('Error completing booking', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while completing booking' });
    }
};

/**
 * @desc    Mark a booking as no-show (Admin/Super Admin only)
 * @route   PUT /api/bookings/:id/mark-no-show
 * @access  Private (Admin, Super Admin)
 */
const markNoShow = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only admins can mark bookings as no-show' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot mark a cancelled booking as no-show' });
        }

        if (booking.status === 'completed') {
            return res.status(400).json({ message: 'Cannot mark a completed booking as no-show' });
        }

        booking.status = 'no_show';
        await booking.save();

        await booking.populate('student', 'schoolId');

        await createNoShowNotifications(booking);

        trackEvent(
            'tutoring_session_no_show',
            { noShowParty: 'unknown' },
            {
                actorUserId: req.user.id,
                subjectStudentId: booking.student._id || booking.student,
                bookingId: booking._id,
                schoolId: booking.student.schoolId,
            },
        ).catch(() => {});

        logger.info('Booking marked as no-show', { bookingId: req.params.id, adminId: req.user.id });
        res.json({ message: 'Booking marked as no-show', booking });
    } catch (err) {
        logger.error('Error marking no-show', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while marking no-show' });
    }
};

/**
 * @desc    Add or update session notes (Tutor only)
 * @route   PUT /api/bookings/:id/notes
 * @access  Private (Tutor)
 */
const updateSessionNotes = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can add session notes' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if the booking is assigned to this tutor
        if (!booking.tutor || booking.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'This booking is not assigned to you' });
        }

        // Only allow notes for completed or scheduled sessions
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot add notes to cancelled sessions' });
        }

        const { topicsCovered, conceptsMastered, areasForImprovement, homeworkAssigned, nextSteps, generalNotes } = req.body;

        // Update session notes
        if (topicsCovered !== undefined) booking.sessionNotes.topicsCovered = topicsCovered;
        if (conceptsMastered !== undefined) booking.sessionNotes.conceptsMastered = conceptsMastered;
        if (areasForImprovement !== undefined) booking.sessionNotes.areasForImprovement = areasForImprovement;
        if (homeworkAssigned !== undefined) booking.sessionNotes.homeworkAssigned = homeworkAssigned;
        if (nextSteps !== undefined) booking.sessionNotes.nextSteps = nextSteps;
        if (generalNotes !== undefined) booking.sessionNotes.generalNotes = generalNotes;
        
        // Set notes metadata
        booking.sessionNotes.notesAddedAt = new Date();
        booking.sessionNotes.notesAddedBy = req.user.id;

        await booking.save();

        await booking.populate('user', 'name email avatar');
        await booking.populate('student', 'name email avatar');
        await booking.populate('tutor', 'name email avatar');
        await booking.populate('sessionNotes.notesAddedBy', 'name email');

        logger.info('Session notes updated', { bookingId: req.params.id, tutorId: req.user.id });
        res.json({ message: 'Session notes updated successfully', booking });
    } catch (err) {
        logger.error('Error updating session notes', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while updating session notes' });
    }
};

/**
 * @desc    Get session notes for a booking
 * @route   GET /api/bookings/:id/notes
 * @access  Private (Tutor, Parent, Student, Admin)
 */
const getSessionNotes = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check permissions: tutor, parent, student, or admin can view notes
        const isTutor = user.role === 'tutor' && booking.tutor && booking.tutor.toString() === req.user.id;
        const isStudent = user.role === 'student' && booking.student.toString() === req.user.id;
        const isParent = user.role === 'parent' && booking.student && 
                        user.children && user.children.includes(booking.student._id || booking.student);
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        const isOwner = booking.user.toString() === req.user.id;

        if (!isTutor && !isStudent && !isParent && !isAdmin && !isOwner) {
            return res.status(403).json({ message: 'You do not have permission to view these notes' });
        }

        await booking.populate('sessionNotes.notesAddedBy', 'name email');
        await booking.populate('tutor', 'name email avatar');
        await booking.populate('student', 'name email avatar');

        res.json({ 
            sessionNotes: booking.sessionNotes,
            booking: {
                _id: booking._id,
                subject: booking.subject,
                sessionDate: booking.sessionDate,
                status: booking.status,
                tutor: booking.tutor,
                student: booking.student,
            }
        });
    } catch (err) {
        logger.error('Error fetching session notes', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while fetching session notes' });
    }
};

/**
 * @desc    Mark a booking as paid (Admin only)
 * @route   PUT /api/bookings/:id/mark-paid
 * @access  Private (Admin)
 */
const markBookingAsPaid = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can mark bookings as paid' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Only mark completed bookings as paid
        if (booking.status !== 'completed') {
            return res.status(400).json({ message: 'Only completed bookings can be marked as paid' });
        }

        booking.paymentStatus = 'Paid';
        await booking.save();

        await booking.populate('user', 'name email avatar');
        await booking.populate('student', 'name email avatar schoolId');
        await booking.populate('tutor', 'name email avatar');

        logger.info('Booking marked as paid', { bookingId: req.params.id, adminId: req.user.id });

        trackEvent(
            'booking_payment_completed',
            {
                paidAmountUsd: Number(booking.price),
                purpose: booking.paymentPurpose === 'membership' ? 'membership' : 'session',
                paidVia: 'admin_mark_paid',
            },
            {
                actorUserId: req.user.id,
                subjectStudentId: booking.student._id || booking.student,
                bookingId: booking._id,
                schoolId: booking.student.schoolId,
            },
        ).catch(() => {});

        res.json({ message: 'Booking marked as paid', booking });
    } catch (err) {
        logger.error('Error marking booking as paid', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while marking booking as paid' });
    }
};

/**
 * @desc    Mark multiple bookings as paid (Admin only)
 * @route   PUT /api/bookings/mark-paid-batch
 * @access  Private (Admin)
 */
const markBookingsAsPaidBatch = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can mark bookings as paid' });
        }

        const { bookingIds } = req.body;
        if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
            return res.status(400).json({ message: 'bookingIds array is required' });
        }

        const bookings = await Booking.find({
            _id: { $in: bookingIds },
            status: 'completed',
        });

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'No completed bookings found' });
        }

        // Mark all as paid
        await Booking.updateMany(
            { _id: { $in: bookings.map(b => b._id) } },
            { paymentStatus: 'Paid' }
        );

        logger.info('Bookings marked as paid (batch)', { count: bookings.length, adminId: req.user.id });
        res.json({ 
            message: `${bookings.length} booking(s) marked as paid successfully`,
            count: bookings.length
        });
    } catch (err) {
        logger.error('Error marking bookings as paid (batch)', { error: err.message });
        res.status(500).json({ message: 'Server error while marking bookings as paid' });
    }
};

/**
 * @desc    Get a single booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const booking = await Booking.findById(id)
            .populate('user', 'name email avatar role')
            .populate('student', 'name email avatar role')
            .populate('tutor', 'name email avatar role');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check authorization - user must be the student, tutor, parent, or admin
        let isAuthorized = 
            booking.user._id.toString() === userId ||
            booking.student._id.toString() === userId ||
            (booking.tutor && booking.tutor._id.toString() === userId) ||
            userRole === 'admin' ||
            userRole === 'super_admin';

        // If user is a parent, check if the booking's student is one of their children
        if (!isAuthorized && userRole === 'parent') {
            const user = await User.findById(userId);
            if (user && user.children && user.children.length > 0) {
                const studentId = booking.student._id.toString();
                const childrenIds = user.children.map(child => 
                    (child._id || child).toString()
                );
                if (childrenIds.includes(studentId)) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to view this booking' });
        }

        res.json(booking);
    } catch (err) {
        logger.error('Error fetching booking by ID', { error: err.message, bookingId: req.params.id });
        res.status(500).json({ message: 'Server error while fetching booking' });
    }
};

module.exports = {
    createBooking,
    getUserBookings,
    getAllBookings,
    getBookingById,
    updateBooking,
    cancelBooking,
    deleteBooking,
    getTutorBookings,
    acceptBooking,
    declineBooking,
    completeBooking,
    markNoShow,
    markBookingAsPaid,
    markBookingsAsPaidBatch,
    updateSessionNotes,
    getSessionNotes,
};
