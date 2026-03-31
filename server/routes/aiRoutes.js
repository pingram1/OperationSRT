const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/AuthMiddleware');
const { generateStudyPlan, generatePracticeQuestions } = require('../controllers/aiController');

/**
 * @route   POST /api/ai/study-plan
 * @desc    Generate AI study plan based on upcoming sessions
 * @access  Private
 */
router.post('/study-plan', authMiddleware, generateStudyPlan);

/**
 * @route   POST /api/ai/practice-questions
 * @desc    Generate practice questions for a subject
 * @access  Private
 */
router.post('/practice-questions', authMiddleware, generatePracticeQuestions);

module.exports = router;












