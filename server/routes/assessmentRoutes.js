const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/AuthMiddleware');
const {
    completeAssessment,
    getAssessmentStatus,
    processStudentAssessment,
    processTutorAssessment
} = require('../controllers/assessmentController');

// All assessment routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/assessment/complete
 * @desc    Save assessment results to user profile
 * @access  Private
 */
router.post('/complete', completeAssessment);

/**
 * @route   GET /api/assessment/status
 * @desc    Check if user has completed assessment
 * @access  Private
 */
router.get('/status', getAssessmentStatus);

/**
 * @route   POST /api/assessment/student
 * @desc    Process student-specific assessment
 * @access  Private
 */
router.post('/student', processStudentAssessment);

/**
 * @route   POST /api/assessment/tutor
 * @desc    Process tutor-specific assessment (includes teaching strengths)
 * @access  Private
 */
router.post('/tutor', processTutorAssessment);

module.exports = router;






