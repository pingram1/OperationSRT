const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/AuthMiddleware');
const { createBookingRoom, getRoomInfo } = require('../controllers/wherebyController');

/**
 * @route   POST /api/whereby/create-room
 * @desc    Create a Whereby video room for a booking
 * @access  Private
 */
router.post('/create-room', authMiddleware, createBookingRoom);

/**
 * @route   GET /api/whereby/room/:roomId
 * @desc    Get room information
 * @access  Private
 */
router.get('/room/:roomId', authMiddleware, getRoomInfo);

module.exports = router;


