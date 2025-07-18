const express = require('express');
const router = express.Router();

// Import the controller function that contains the logic
const { generateAiContent } = require('../controllers/aiController');
// Import your authentication middleware to protect this route
const { authMiddleware } = require('../middleware/AuthMiddleware');

/**
 * @route   POST /api/ai/generate
 * @desc    Acts as a secure proxy to the Gemini API
 * @access  Private
 * This route is protected. Only logged-in users can make requests to the AI.
 */
router.post('/generate', authMiddleware, generateAiContent);

module.exports = router;
