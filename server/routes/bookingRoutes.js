const express = require('express');
const router = express.Router();

// Import the controller functions that contain the logic for each route.
// This was the missing piece causing the error.
const { 
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
} = require('../controllers/bookingController');

// Import the authentication middleware to protect all booking routes.
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private
 * This route is protected by authMiddleware. A user must be logged in to create a booking.
 */
router.post('/', authMiddleware, createBooking);

/**
 * @route   GET /api/bookings/all
 * @desc    Get all bookings (Admin only)
 * @access  Private (Admin only)
 * NOTE: This route MUST come before GET / to avoid route conflicts
 * Express matches routes in order, so /all must be defined before /
 */
router.get('/all', authMiddleware, getAllBookings);

/**
 * @route   GET /api/bookings/tutor
 * @desc    Get all bookings for a tutor
 * @access  Private (Tutor)
 */
router.get('/tutor', authMiddleware, getTutorBookings);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings for the logged-in user
 * @access  Private
 */
router.get('/', authMiddleware, getUserBookings);

/**
 * @route   PUT /api/bookings/:id/accept
 * @desc    Accept a booking (Tutor only)
 * @access  Private (Tutor)
 * NOTE: This route MUST come before /:id to avoid route conflicts
 */
router.put('/:id/accept', authMiddleware, acceptBooking);

/**
 * @route   PUT /api/bookings/:id/decline
 * @desc    Decline a booking (Tutor only)
 * @access  Private (Tutor)
 * NOTE: This route MUST come before /:id to avoid route conflicts
 */
router.put('/:id/decline', authMiddleware, declineBooking);

/**
 * @route   PUT /api/bookings/:id/complete
 * @desc    Mark a booking as complete (Tutor only)
 * @access  Private (Tutor)
 * NOTE: This route MUST come before /:id to avoid route conflicts
 */
router.put('/:id/complete', authMiddleware, completeBooking);

/**
 * @route   PUT /api/bookings/:id/mark-paid
 * @desc    Mark a booking as paid (Admin only)
 * @access  Private (Admin)
 * NOTE: This route MUST come before /:id to avoid route conflicts
 */
router.put('/:id/mark-paid', authMiddleware, markBookingAsPaid);

/**
 * @route   PUT /api/bookings/:id/mark-no-show
 * @desc    Mark a booking as no-show (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/mark-no-show', authMiddleware, authorize('admin'), markNoShow);

/**
 * @route   PUT /api/bookings/:id/notes
 * @desc    Add or update session notes (Tutor only)
 * @access  Private (Tutor)
 * NOTE: This route MUST come before /:id to avoid route conflicts
 */
router.put('/:id/notes', authMiddleware, updateSessionNotes);

/**
 * @route   GET /api/bookings/:id/notes
 * @desc    Get session notes for a booking
 * @access  Private (Tutor, Parent, Student, Admin)
 * NOTE: This route MUST come before /:id to avoid route conflicts
 */
router.get('/:id/notes', authMiddleware, getSessionNotes);

/**
 * @route   PUT /api/bookings/mark-paid-batch
 * @desc    Mark multiple bookings as paid (Admin only)
 * @access  Private (Admin)
 * NOTE: This static segment MUST be registered before PUT /:id, otherwise
 * Express matches the literal "mark-paid-batch" as :id and falls through to
 * updateBooking with an invalid ObjectId.
 */
router.put('/mark-paid-batch', authMiddleware, markBookingsAsPaidBatch);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get a single booking by ID
 * @access  Private (Student, Tutor, Parent, Admin)
 * NOTE: This route MUST come after all specific /:id routes to avoid conflicts
 */
router.get('/:id', authMiddleware, getBookingById);

/**
 * @route   PUT /api/bookings/:id
 * @desc    Update a booking (Admin only)
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, updateBooking);

/**
 * @route   DELETE /api/bookings/:id/delete
 * @desc    Delete a booking permanently (Admin only)
 * @access  Private (Admin only)
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.delete('/:id/delete', authMiddleware, deleteBooking);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Cancel a specific booking
 * @access  Private
 */
router.delete('/:id', authMiddleware, cancelBooking);


// Export the router so it can be used by the main server.js file.
module.exports = router;
