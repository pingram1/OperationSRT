const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const { getAnalytics } = require('../controllers/analyticsController');

/**
 * @route   GET /api/analytics
 * @desc    Get analytics data for admin dashboard
 * @access  Private (Admin only)
 * @query   days - Number of days to fetch analytics for (default: 30)
 */
router.get('/', authMiddleware, authorize('admin'), getAnalytics);

module.exports = router;

