const express = require('express');
const router = express.Router();

// Import the controller functions that contain the logic for each route.
// This was the missing piece causing the error.
const { 
    createBooking, 
    getUserBookings, 
    cancelBooking 
} = require('../controllers/bookingController');

// Import the authentication middleware to protect all booking routes.
const { authMiddleware } = require('../middleware/AuthMiddleware');

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private
 * This route is protected by authMiddleware. A user must be logged in to create a booking.
 */
router.post('/', authMiddleware, createBooking);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings for the logged-in user
 * @access  Private
 */
router.get('/', authMiddleware, getUserBookings);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Cancel a specific booking
 * @access  Private
 */
router.delete('/:id', authMiddleware, cancelBooking);


// Export the router so it can be used by the main server.js file.
module.exports = router;
