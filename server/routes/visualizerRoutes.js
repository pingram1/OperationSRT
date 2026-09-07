const express = require('express');
const router = express.Router();
const {
    listVisualizers,
    getVisualizer,
    startSession,
    completeSession,
} = require('../controllers/visualizerController');
const { authMiddleware } = require('../middleware/AuthMiddleware');

// Optional auth — attaches req.user when a valid token is present.
const optionalAuth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const jwt = require('jsonwebtoken');
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.user;
        } catch (_) {
            // Invalid token — continue without user context.
        }
    }
    next();
};

router.get('/', optionalAuth, listVisualizers);
router.get('/:gameId', getVisualizer);
router.post('/:gameId/start', authMiddleware, startSession);
router.post('/:gameId/complete', authMiddleware, completeSession);

module.exports = router;
