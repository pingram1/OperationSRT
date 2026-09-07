const express = require('express');
const router = express.Router();

// Import the controller functions that contain the logic for each route.
// This was the missing piece causing the error.
const {
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    getTutors,
    getStudents,
    updateUser,
    deleteUser,
    updatePassword,
    enableTwoFactor,
    verifyTwoFactorSetup,
    disableTwoFactor,
    linkChildToParent,
    unlinkChildFromParent,
    updateStudentPaymentPermission,
    uploadCertificationBadge,
    deleteCertificationBadge,
    updateCertificationBadge
} = require('../controllers/userController');

const {
    sendParentLinkRequest,
    getParentLinkRequests,
    acceptParentLinkRequest,
    rejectParentLinkRequest,
    cancelParentLinkRequest,
} = require('../controllers/parentLinkController');

// Import the authentication middleware to protect routes.
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const { uploadBadge, handleUploadError, verifyUploadedFileContent } = require('../middleware/uploadMiddleware');

/**
 * @route   GET /api/users/profile
 * @desc    Get the profile of the currently logged-in user
 * @access  Private
 * The 'authMiddleware' ensures only logged-in users can access this.
 */
router.get('/profile', authMiddleware, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update a user's profile
 * @access  Private
 */
router.put('/profile', authMiddleware, updateUserProfile);

/**
 * @route   PUT /api/users/profile/password
 * @desc    Update user's password
 * @access  Private
 */
router.put('/profile/password', authMiddleware, updatePassword);

/**
 * @route   POST /api/users/profile/2fa/enable
 * @desc    Enable two-factor authentication
 * @access  Private
 */
router.post('/profile/2fa/enable', authMiddleware, enableTwoFactor);

/**
 * @route   POST /api/users/profile/2fa/verify
 * @desc    Verify a TOTP code and activate 2FA
 * @access  Private
 */
router.post('/profile/2fa/verify', authMiddleware, verifyTwoFactorSetup);

/**
 * @route   POST /api/users/profile/2fa/disable
 * @desc    Disable two-factor authentication
 * @access  Private
 */
router.post('/profile/2fa/disable', authMiddleware, disableTwoFactor);

/**
 * @route   GET /api/users
 * @desc    Get all users (for admin purposes)
 * @access  Private/Admin
 * The 'authorize('admin')' middleware ensures only users with the 'admin' role can access this.
 */
router.get('/', authMiddleware, authorize('admin'), getAllUsers);

/**
 * @route   GET /api/users/tutors
 * @desc    Get all tutors (accessible to all authenticated users)
 * @access  Private
 * This endpoint allows any authenticated user to see available tutors for booking purposes.
 * NOTE: This route must come before /:id routes to avoid matching 'tutors' as an ID
 */
router.get('/tutors', authMiddleware, getTutors);

/**
 * @route   GET /api/users/students
 * @desc    Get all students (Admin only, for parent-child linking)
 * @access  Private/Admin
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.get('/students', authMiddleware, authorize('admin'), getStudents);

/**
 * @route   POST /api/users/parent-link-request
 * @desc    Send a parent link request to a student by email
 * @access  Private (Parent)
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.post('/parent-link-request', authMiddleware, sendParentLinkRequest);

/**
 * @route   GET /api/users/parent-link-requests
 * @desc    Get all parent link requests (for students and parents)
 * @access  Private (Student, Parent)
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.get('/parent-link-requests', authMiddleware, getParentLinkRequests);

/**
 * @route   PUT /api/users/parent-link-request/:requestId/accept
 * @desc    Accept a parent link request
 * @access  Private (Student)
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.put('/parent-link-request/:requestId/accept', authMiddleware, acceptParentLinkRequest);

/**
 * @route   PUT /api/users/parent-link-request/:requestId/reject
 * @desc    Reject a parent link request
 * @access  Private (Student)
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.put('/parent-link-request/:requestId/reject', authMiddleware, rejectParentLinkRequest);

/**
 * @route   PUT /api/users/parent-link-request/:requestId/cancel
 * @desc    Cancel a parent link request
 * @access  Private (Parent)
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.put('/parent-link-request/:requestId/cancel', authMiddleware, cancelParentLinkRequest);

/**
 * @route   PUT /api/users/student-payment-permission/:studentId
 * @desc    Update payment permission for a student (Parent only)
 * @access  Private (Parent)
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.put('/student-payment-permission/:studentId', authMiddleware, updateStudentPaymentPermission);

/**
 * @route   POST /api/users/profile/certification-badges
 * @desc    Upload a certification badge (Tutor, Admin, Super Admin only)
 * @access  Private (Tutor, Admin, Super Admin)
 */
router.post('/profile/certification-badges', authMiddleware, uploadBadge.single('badgeImage'), handleUploadError, verifyUploadedFileContent, uploadCertificationBadge);

/**
 * @route   PUT /api/users/profile/certification-badges/:badgeIndex
 * @desc    Update a certification badge (Tutor, Admin, Super Admin only)
 * @access  Private (Tutor, Admin, Super Admin)
 */
router.put('/profile/certification-badges/:badgeIndex', authMiddleware, uploadBadge.single('badgeImage'), handleUploadError, verifyUploadedFileContent, updateCertificationBadge);

/**
 * @route   DELETE /api/users/profile/certification-badges/:badgeIndex
 * @desc    Delete a certification badge (Tutor, Admin, Super Admin only)
 * @access  Private (Tutor, Admin, Super Admin)
 */
router.delete('/profile/certification-badges/:badgeIndex', authMiddleware, deleteCertificationBadge);

/**
 * @route   POST /api/users/:parentId/link-child/:childId
 * @desc    Link a student to a parent (Admin only)
 * @access  Private/Admin
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.post('/:parentId/link-child/:childId', authMiddleware, authorize('admin'), linkChildToParent);

/**
 * @route   DELETE /api/users/:parentId/unlink-child/:childId
 * @desc    Unlink a student from a parent (Admin only)
 * @access  Private/Admin
 * NOTE: This route must come before /:id routes to avoid route conflicts
 */
router.delete('/:parentId/unlink-child/:childId', authMiddleware, authorize('admin'), unlinkChildFromParent);

/**
 * @route   PUT /api/users/:id
 * @desc    Update a user by ID (Admin only)
 * @access  Private/Admin
 * NOTE: This route must come after specific routes to avoid route conflicts
 */
router.put('/:id', authMiddleware, authorize('admin'), updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user by ID (Admin only)
 * @access  Private/Admin
 * NOTE: This route must come after specific routes to avoid route conflicts
 */
router.delete('/:id', authMiddleware, authorize('admin'), deleteUser);

// Export the router so it can be used by the main server.js file.
module.exports = router;
