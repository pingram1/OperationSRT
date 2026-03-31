const express = require('express');
const router = express.Router();

const {
    getAllTutors,
    getPendingApplications,
    getActiveTutors,
    getTutorStats,
    approveTutor,
    denyTutor,
    updateTutor,
    createTutor,
    getTutorStudents,
    getTutorDashboardStats,
} = require('../controllers/tutorController');

const { authMiddleware } = require('../middleware/AuthMiddleware');

/**
 * @route   POST /api/tutors
 * @desc    Create a new tutor account (Admin only)
 * @access  Private (Admin)
 */
router.post('/', authMiddleware, createTutor);

/**
 * @route   GET /api/tutors
 * @desc    Get all tutors
 * @access  Private (Admin)
 */
router.get('/', authMiddleware, getAllTutors);

/**
 * @route   GET /api/tutors/pending
 * @desc    Get pending tutor applications
 * @access  Private (Admin)
 */
router.get('/pending', authMiddleware, getPendingApplications);

/**
 * @route   GET /api/tutors/active
 * @desc    Get active tutors
 * @access  Private (Admin)
 */
router.get('/active', authMiddleware, getActiveTutors);

/**
 * @route   GET /api/tutors/stats
 * @desc    Get tutor management statistics
 * @access  Private (Admin)
 */
router.get('/stats', authMiddleware, getTutorStats);

/**
 * @route   PUT /api/tutors/:id/approve
 * @desc    Approve a tutor application
 * @access  Private (Admin)
 */
router.put('/:id/approve', authMiddleware, approveTutor);

/**
 * @route   PUT /api/tutors/:id
 * @desc    Update tutor information
 * @access  Private (Admin)
 */
router.put('/:id', authMiddleware, updateTutor);

/**
 * @route   DELETE /api/tutors/:id
 * @desc    Deny/reject a tutor application
 * @access  Private (Admin)
 */
router.delete('/:id', authMiddleware, denyTutor);

/**
 * @route   GET /api/tutors/me/students
 * @desc    Get tutor's student roster
 * @access  Private (Tutor)
 * NOTE: This route MUST come before /:id routes to avoid conflicts
 */
router.get('/me/students', authMiddleware, getTutorStudents);

/**
 * @route   GET /api/tutors/me/stats
 * @desc    Get tutor dashboard stats
 * @access  Private (Tutor)
 * NOTE: This route MUST come before /:id routes to avoid conflicts
 */
router.get('/me/stats', authMiddleware, getTutorDashboardStats);

module.exports = router;

