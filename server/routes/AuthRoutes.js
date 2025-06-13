const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/authController');

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', registerUser);

// You will add the login route here later, e.g., router.post('/login', loginUser);

module.exports = router;
