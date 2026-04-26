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

const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');

const requireAdmin = [authMiddleware, authorize('admin', 'super_admin')];

/**
 * @route   POST /api/tutors
 * @desc    Create a new tutor account (Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.post('/', requireAdmin, createTutor);

/**
 * @route   GET /api/tutors
 * @desc    Get all tutors
 * @access  Private (Admin, Super Admin)
 */
router.get('/', requireAdmin, getAllTutors);

/**
 * @route   GET /api/tutors/pending
 * @desc    Get pending tutor applications
 * @access  Private (Admin, Super Admin)
 */
router.get('/pending', requireAdmin, getPendingApplications);

/**
 * @route   GET /api/tutors/active
 * @desc    Get active tutors
 * @access  Private (Admin, Super Admin)
 */
router.get('/active', requireAdmin, getActiveTutors);

/**
 * @route   GET /api/tutors/stats
 * @desc    Get tutor management statistics
 * @access  Private (Admin, Super Admin)
 */
router.get('/stats', requireAdmin, getTutorStats);

/**
 * @route   GET /api/tutors/me/students
 * @desc    Get tutor's student roster
 * @access  Private (Tutor, Super Admin)
 * NOTE: Must be defined before /:id routes
 */
router.get('/me/students', authMiddleware, getTutorStudents);

/**
 * @route   GET /api/tutors/me/stats
 * @desc    Get tutor dashboard stats
 * @access  Private (Tutor, Super Admin)
 * NOTE: Must be defined before /:id routes
 */
router.get('/me/stats', authMiddleware, getTutorDashboardStats);

/**
 * @route   PUT /api/tutors/:id/approve
 * @desc    Approve a tutor application
 * @access  Private (Admin, Super Admin)
 */
router.put('/:id/approve', requireAdmin, approveTutor);

/**
 * @route   PUT /api/tutors/:id
 * @desc    Update tutor information
 * @access  Private (Admin, Super Admin)
 */
router.put('/:id', requireAdmin, updateTutor);

/**
 * @route   DELETE /api/tutors/:id
 * @desc    Deny/reject a tutor application
 * @access  Private (Admin, Super Admin)
 */
router.delete('/:id', requireAdmin, denyTutor);

module.exports = router;
