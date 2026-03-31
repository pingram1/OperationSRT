const express = require('express');
const router = express.Router();
const { 
    checkAndAwardAchievements,
    getStudentAchievements,
    getAllAchievements,
} = require('../controllers/achievementController');
const { authMiddleware } = require('../middleware/AuthMiddleware');

/**
 * @route   POST /api/achievements/check/:studentId
 * @desc    Check and award achievements for a student
 * @access  Private (Admin, Parent, Student)
 */
router.post('/check/:studentId', authMiddleware, checkAndAwardAchievements);

/**
 * @route   GET /api/achievements/student/:studentId
 * @desc    Get all achievements for a student
 * @access  Private (Admin, Parent, Student)
 */
router.get('/student/:studentId', authMiddleware, getStudentAchievements);

/**
 * @route   GET /api/achievements/all
 * @desc    Get all achievements (Admin only)
 * @access  Private (Admin)
 */
router.get('/all', authMiddleware, getAllAchievements);

module.exports = router;












