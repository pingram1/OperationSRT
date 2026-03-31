const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const {
    findTutorMatches,
    getCompatibilityAnalysis,
    recordMatchFeedback,
    getMatchingAnalytics,
    optimizeMatchingWeights
} = require('../controllers/matchingController');

// All matching routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/matching/find-tutors
 * @desc    Find best tutor matches for a student
 * @access  Private
 */
router.post('/find-tutors', findTutorMatches);

/**
 * @route   GET /api/matching/compatibility/:tutorId/:studentId
 * @desc    Get detailed compatibility analysis between tutor and student
 * @access  Private
 */
router.get('/compatibility/:tutorId/:studentId', getCompatibilityAnalysis);

/**
 * @route   POST /api/matching/feedback
 * @desc    Record match feedback for continuous improvement
 * @access  Private
 */
router.post('/feedback', recordMatchFeedback);

/**
 * @route   GET /api/matching/analytics
 * @desc    Get matching analytics for admin
 * @access  Private (Admin only)
 */
router.get('/analytics', authorize('admin'), getMatchingAnalytics);

/**
 * @route   POST /api/matching/optimize-weights
 * @desc    Run weight optimization from feedback and persist to SystemConfig
 * @access  Private (Admin only)
 */
router.post('/optimize-weights', authorize('admin'), optimizeMatchingWeights);

module.exports = router;






