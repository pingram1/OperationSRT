const express = require('express');
const router = express.Router();

// Import the controller functions that contain the logic for each route.
// This was the missing piece causing the error.
const { 
    getUserProfile, 
    updateUserProfile, 
    getAllUsers 
} = require('../controllers/userController');

// Import the authentication middleware to protect routes.
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');

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
 * @route   GET /api/users
 * @desc    Get all users (for admin purposes)
 * @access  Private/Admin
 * The 'authorize('admin')' middleware ensures only users with the 'admin' role can access this.
 */
router.get('/', authMiddleware, authorize('admin'), getAllUsers);

// Export the router so it can be used by the main server.js file.
module.exports = router;
