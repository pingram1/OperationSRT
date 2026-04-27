const express = require('express');
const router = express.Router();

const {
    registerUser,
    registerEmployee,
    registerWithCode,
    loginUser,
    getLoggedInUser,
    refreshToken,
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/AuthMiddleware');
const { validateRequest } = require('../middleware/validate');
const authValidators = require('../middleware/validators/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authValidators.register, validateRequest, registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate a user and get a token
 * @access  Public
 */
router.post('/login', authValidators.login, validateRequest, loginUser);

/**
 * @route   POST /api/auth/register-employee
 * @desc    Register a new employee (tutor or admin)
 * @access  Public (restricted - see controller logic)
 */
router.post(
    '/register-employee',
    authValidators.registerEmployee,
    validateRequest,
    registerEmployee,
);

/**
 * @route   POST /api/auth/register-with-code
 * @desc    Register a student linked to a school via the school's registrationCode
 * @access  Public
 */
router.post(
    '/register-with-code',
    authValidators.registerWithCode,
    validateRequest,
    registerWithCode,
);

/**
 * @route   GET /api/auth/user
 * @desc    Get the data of the currently logged-in user
 * @access  Private
 */
router.get('/user', authMiddleware, getLoggedInUser);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authValidators.refresh, validateRequest, refreshToken);

module.exports = router;
