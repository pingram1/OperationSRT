const express = require('express');
const router = express.Router();

// Import the controller functions that contain the logic for each route.
const { registerUser, loginUser, getLoggedInUser } = require('../controllers/authController');

// Import the authentication middleware to protect routes.
const { authMiddleware } = require('../middleware/AuthMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * This endpoint allows anyone to create a new account.
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate a user and get a token
 * @access  Public
 * This endpoint allows users to log in with their email and password.
 */
router.post('/login', loginUser);

/**
 * @route   GET /api/auth/user
 * @desc    Get the data of the currently logged-in user
 * @access  Private
 * This route is protected by the 'authMiddleware'. The request will only
 * proceed to the 'getLoggedInUser' controller if a valid JWT is provided
 * in the request header.
 */
router.get('/user', authMiddleware, getLoggedInUser);

// Export the router so it can be used by the main server.js file.
module.exports = router;

