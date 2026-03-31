const express = require('express');
const router = express.Router();
const {
    getAllChallenges,
    getChallengeById,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    startChallenge,
    submitAnswer,
    completeChallenge,
    getLeaderboard,
} = require('../controllers/challengeController');
const { authMiddleware } = require('../middleware/AuthMiddleware');

// Optional auth middleware - adds user to req if token exists, but doesn't require it
const optionalAuth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const jwt = require('jsonwebtoken');
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.user;
        } catch (err) {
            // Invalid token, but continue without user
        }
    }
    next();
};

// Public routes (with optional auth for personalized status)
router.get('/', optionalAuth, getAllChallenges);
router.get('/leaderboard', getLeaderboard);
router.get('/:id', optionalAuth, getChallengeById);

// Admin-only routes (require authentication and admin role)
router.post('/', authMiddleware, createChallenge);
router.put('/:id', authMiddleware, updateChallenge);
router.delete('/:id', authMiddleware, deleteChallenge);

// Protected routes (require authentication)
router.post('/:id/start', authMiddleware, startChallenge);
router.post('/:id/answer', authMiddleware, submitAnswer);
router.post('/:id/complete', authMiddleware, completeChallenge);

module.exports = router;

