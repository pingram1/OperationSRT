const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const {
    createAnnouncement,
    getAllAnnouncements,
    getUserAnnouncements,
    deleteAnnouncement,
    updateAnnouncement,
} = require('../controllers/announcementController');

/**
 * @route   GET /api/announcements/user
 * @desc    Get announcements relevant to the current user
 * @access  Private (All authenticated users)
 */
router.get('/user', authMiddleware, getUserAnnouncements);

/**
 * @route   GET /api/announcements
 * @desc    Get all announcements (Admin view)
 * @access  Private (Admin only)
 */
router.get('/', authMiddleware, authorize('admin'), getAllAnnouncements);

/**
 * @route   POST /api/announcements
 * @desc    Create a new announcement
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, authorize('admin'), createAnnouncement);

/**
 * @route   PUT /api/announcements/:id
 * @desc    Update an announcement
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, authorize('admin'), updateAnnouncement);

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete an announcement
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, authorize('admin'), deleteAnnouncement);

module.exports = router;

