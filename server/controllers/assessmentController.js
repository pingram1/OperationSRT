const User = require('../models/User');
const { LearningStyleProfile, LearningStyleMatcher } = require('../utils/matchingUtils');

const matcher = new LearningStyleMatcher();

/**
 * @desc    Save assessment results to user profile
 * @route   POST /api/assessment/complete
 * @access  Private
 */
const completeAssessment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { answers, userType } = req.body; // userType: 'student' or 'tutor'

        if (!answers) {
            return res.status(400).json({ message: 'Assessment answers are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Process assessment answers
        const assessmentData = {
            name: user.name,
            is_tutor: userType === 'tutor' || user.role === 'tutor' || user.role === 'super_admin',
            ...answers
        };

        const profile = matcher.assessLearningStyle(assessmentData);

        // Update user's learning style profile
        if (!user.learningStyleProfile) {
            user.learningStyleProfile = {};
        }

        user.learningStyleProfile.dimensions = {
            visual_verbal: profile.dimensions.visual_verbal,
            sequential_global: profile.dimensions.sequential_global,
            active_reflective: profile.dimensions.active_reflective,
            structured_flexible: profile.dimensions.structured_flexible
        };

        if (userType === 'tutor' || user.role === 'tutor' || user.role === 'super_admin') {
            user.learningStyleProfile.teachingStrengths = profile.teachingStrengths || [];
            user.learningStyleProfile.subjectExpertise = profile.subjectExpertise || {};
        } else {
            user.learningStyleProfile.learningNeeds = profile.learningNeeds || [];
        }

        user.learningStyleProfile.assessmentCompleted = true;
        user.learningStyleProfile.lastAssessmentDate = new Date();

        await user.save();

        console.log(`[completeAssessment] Assessment completed for user ${userId}`);
        res.json({
            message: 'Assessment completed successfully',
            profile: {
                dimensions: user.learningStyleProfile.dimensions,
                teachingStrengths: user.learningStyleProfile.teachingStrengths,
                learningNeeds: user.learningStyleProfile.learningNeeds,
                subjectExpertise: user.learningStyleProfile.subjectExpertise
            }
        });
    } catch (err) {
        console.error('[completeAssessment] Error:', err.message);
        res.status(500).json({ message: 'Server error while saving assessment', error: err.message });
    }
};

/**
 * @desc    Check if user has completed assessment
 * @route   GET /api/assessment/status
 * @access  Private
 */
const getAssessmentStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('learningStyleProfile role');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const completed = user.learningStyleProfile?.assessmentCompleted || false;
        const lastAssessmentDate = user.learningStyleProfile?.lastAssessmentDate || null;

        res.json({
            completed,
            lastAssessmentDate,
            profile: completed ? {
                dimensions: user.learningStyleProfile.dimensions,
                teachingStrengths: user.learningStyleProfile.teachingStrengths,
                learningNeeds: user.learningStyleProfile.learningNeeds,
                subjectExpertise: user.learningStyleProfile.subjectExpertise ? 
                    Object.fromEntries(user.learningStyleProfile.subjectExpertise) : {}
            } : null
        });
    } catch (err) {
        console.error('[getAssessmentStatus] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching assessment status', error: err.message });
    }
};

/**
 * @desc    Process student-specific assessment
 * @route   POST /api/assessment/student
 * @access  Private
 */
const processStudentAssessment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { answers } = req.body;

        if (!answers) {
            return res.status(400).json({ message: 'Assessment answers are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'student' && user.role !== 'parent') {
            return res.status(400).json({ message: 'This endpoint is for students only' });
        }

        // Process with student-specific logic
        const assessmentData = {
            name: user.name,
            is_tutor: false,
            ...answers
        };

        const profile = matcher.assessLearningStyle(assessmentData);

        // Update user profile
        if (!user.learningStyleProfile) {
            user.learningStyleProfile = {};
        }

        user.learningStyleProfile.dimensions = profile.dimensions;
        user.learningStyleProfile.learningNeeds = profile.learningNeeds || [];
        user.learningStyleProfile.assessmentCompleted = true;
        user.learningStyleProfile.lastAssessmentDate = new Date();

        await user.save();

        res.json({
            message: 'Student assessment completed successfully',
            profile: {
                dimensions: user.learningStyleProfile.dimensions,
                learningNeeds: user.learningStyleProfile.learningNeeds
            }
        });
    } catch (err) {
        console.error('[processStudentAssessment] Error:', err.message);
        res.status(500).json({ message: 'Server error while processing student assessment', error: err.message });
    }
};

/**
 * @desc    Process tutor-specific assessment (includes teaching strengths)
 * @route   POST /api/assessment/tutor
 * @access  Private
 */
const processTutorAssessment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { answers } = req.body;

        if (!answers) {
            return res.status(400).json({ message: 'Assessment answers are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'tutor' && user.role !== 'super_admin') {
            return res.status(400).json({ message: 'This endpoint is for tutors only' });
        }

        // Process with tutor-specific logic
        const assessmentData = {
            name: user.name,
            is_tutor: true,
            ...answers
        };

        const profile = matcher.assessLearningStyle(assessmentData);

        // Update user profile
        if (!user.learningStyleProfile) {
            user.learningStyleProfile = {};
        }

        user.learningStyleProfile.dimensions = profile.dimensions;
        user.learningStyleProfile.teachingStrengths = profile.teachingStrengths || [];
        user.learningStyleProfile.subjectExpertise = profile.subjectExpertise || {};
        user.learningStyleProfile.assessmentCompleted = true;
        user.learningStyleProfile.lastAssessmentDate = new Date();

        await user.save();

        res.json({
            message: 'Tutor assessment completed successfully',
            profile: {
                dimensions: user.learningStyleProfile.dimensions,
                teachingStrengths: user.learningStyleProfile.teachingStrengths,
                subjectExpertise: user.learningStyleProfile.subjectExpertise ? 
                    Object.fromEntries(user.learningStyleProfile.subjectExpertise) : {}
            }
        });
    } catch (err) {
        console.error('[processTutorAssessment] Error:', err.message);
        res.status(500).json({ message: 'Server error while processing tutor assessment', error: err.message });
    }
};

module.exports = {
    completeAssessment,
    getAssessmentStatus,
    processStudentAssessment,
    processTutorAssessment
};






