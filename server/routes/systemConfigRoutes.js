const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const {
    getSystemConfig,
    updateSystemConfig,
    getTutorSchedule,
    getSubjects,
} = require('../controllers/systemConfigController');

/**
 * @route   GET /api/system-config
 * @desc    Get system configuration
 * @access  Private (Admin only)
 */
router.get('/', authMiddleware, authorize('admin'), getSystemConfig);

/**
 * @route   PUT /api/system-config
 * @desc    Update system configuration
 * @access  Private (Admin only)
 */
router.put('/', authMiddleware, authorize('admin'), updateSystemConfig);

/**
 * @route   GET /api/system-config/tutor-schedule
 * @desc    Get tutor schedule (for tutors to view)
 * @access  Private (Tutors and Admin)
 */
router.get('/tutor-schedule', authMiddleware, getTutorSchedule);

/**
 * @route   GET /api/system-config/subjects
 * @desc    Get available subjects (public endpoint for booking forms)
 * @access  Public (no auth required)
 */
router.get('/subjects', getSubjects);

module.exports = router;

