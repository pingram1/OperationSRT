const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/AuthMiddleware');
const {
    getTimeSlots,
    getTutorAvailabilitySchedule,
    getMyAvailability,
    updateMyAvailability,
} = require('../controllers/availabilityController');

/**
 * @route   GET /api/availability/slots
 * @desc    Get available time slots for a specific date
 * @access  Private
 */
router.get('/slots', authMiddleware, getTimeSlots);

/**
 * @route   GET /api/availability/tutor/:tutorId
 * @desc    Get tutor's availability schedule
 * @access  Private
 */
router.get('/tutor/:tutorId', authMiddleware, getTutorAvailabilitySchedule);

/**
 * @route   GET /api/availability/me
 * @desc    Get current tutor's availability schedule
 * @access  Private (Tutor)
 */
router.get('/me', authMiddleware, getMyAvailability);

/**
 * @route   PUT /api/availability/me
 * @desc    Update current tutor's availability schedule
 * @access  Private (Tutor)
 */
router.put('/me', authMiddleware, updateMyAvailability);

module.exports = router;












