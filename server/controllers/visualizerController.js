const Visualizer = require('../models/Visualizer');
const VisualizerSession = require('../models/VisualizerSession');
const User = require('../models/User');
const { trackEvent } = require('../services/telemetryService');
const { creditActivityXp } = require('../services/scholarshipService');
const {
    evaluateActivityAttempt,
    previewActivityReward,
    getProgressMap,
} = require('../services/activityRewardService');
const logger = require('../utils/logger');

async function resolveVisualizerByGameId(gameId) {
    return Visualizer.findOne({ gameId, isActive: true });
}

/**
 * @desc    List active concept visualizers
 * @route   GET /api/visualizers
 */
const listVisualizers = async (req, res) => {
    try {
        const { subject, difficulty, gradeLevel } = req.query;
        const query = { isActive: true };

        if (subject) query.subject = subject;
        if (difficulty) query.difficulty = difficulty;
        if (gradeLevel) query.gradeLevels = { $in: [gradeLevel] };

        const visualizers = await Visualizer.find(query).sort({ sortOrder: 1, title: 1 }).lean();

        let progressByActivity = {};
        if (req.user) {
            progressByActivity = await getProgressMap(
                req.user.id,
                'visualizer',
                visualizers.map((v) => v._id),
            );
        }

        const visualizersWithRewards = visualizers.map((viz) => {
            const baseXp = viz.baseXp;
            const reward = previewActivityReward(progressByActivity[viz._id.toString()], baseXp);
            return { ...viz, baseXp, reward };
        });

        res.json(visualizersWithRewards);
    } catch (err) {
        logger.error('[listVisualizers]', { error: err.message });
        res.status(500).json({ message: 'Server error while fetching visualizers' });
    }
};

/**
 * @desc    Get one visualizer by gameId
 * @route   GET /api/visualizers/:gameId
 */
const getVisualizer = async (req, res) => {
    try {
        const visualizer = await resolveVisualizerByGameId(req.params.gameId);
        if (!visualizer) {
            return res.status(404).json({ message: 'Visualizer not found' });
        }
        res.json(visualizer);
    } catch (err) {
        logger.error('[getVisualizer]', { error: err.message });
        res.status(500).json({ message: 'Server error while fetching visualizer' });
    }
};

/**
 * @desc    Start a visualizer session
 * @route   POST /api/visualizers/:gameId/start
 */
const startSession = async (req, res) => {
    try {
        const visualizer = await resolveVisualizerByGameId(req.params.gameId);
        if (!visualizer) {
            return res.status(404).json({ message: 'Visualizer not found' });
        }

        const session = await VisualizerSession.create({
            user: req.user.id,
            visualizer: visualizer._id,
            gameId: visualizer.gameId,
            status: 'in_progress',
            metadata: req.body?.metadata || {},
        });

        res.status(201).json({
            sessionId: session._id,
            gameId: visualizer.gameId,
            baseXp: visualizer.baseXp,
        });
    } catch (err) {
        logger.error('[startSession]', { error: err.message });
        res.status(500).json({ message: 'Server error while starting visualizer session' });
    }
};

/**
 * @desc    Complete a visualizer session and award XP
 * @route   POST /api/visualizers/:gameId/complete
 */
const completeSession = async (req, res) => {
    try {
        const visualizer = await resolveVisualizerByGameId(req.params.gameId);
        if (!visualizer) {
            return res.status(404).json({ message: 'Visualizer not found' });
        }

        const { sessionId, accuracy, score, metadata } = req.body || {};
        const parsedAccuracy = Math.min(100, Math.max(0, Number(accuracy) || 0));
        const parsedScore = Number(score) || 0;

        let session;
        if (sessionId) {
            session = await VisualizerSession.findOne({
                _id: sessionId,
                user: req.user.id,
                visualizer: visualizer._id,
            });
            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }
            if (session.status === 'completed') {
                return res.json({
                    session,
                    xpAwarded: session.xpAwarded,
                    isFirstCompletion: session.isFirstCompletion,
                    userXp: (await User.findById(req.user.id).select('xp level'))?.xp,
                });
            }
        } else {
            session = await VisualizerSession.create({
                user: req.user.id,
                visualizer: visualizer._id,
                gameId: visualizer.gameId,
                status: 'in_progress',
            });
        }

        const reward = await evaluateActivityAttempt({
            userId: req.user.id,
            activityType: 'visualizer',
            activityId: visualizer._id,
            baseXp: visualizer.baseXp,
        });
        const { xpAwarded, isFirstCompletion, payoutType } = reward;

        session.status = 'completed';
        session.score = parsedScore;
        session.accuracy = parsedAccuracy;
        session.xpAwarded = xpAwarded;
        session.isFirstCompletion = isFirstCompletion;
        session.metadata = { ...(session.metadata || {}), ...(metadata || {}), payoutType };
        session.completedAt = new Date();
        await session.save();

        let userXpAfter = null;
        const user = await User.findById(req.user.id);
        if (user) {
            user.visualizerSessionsCompleted = (user.visualizerSessionsCompleted || 0) + 1;
            if (xpAwarded > 0) {
                user.xp += xpAwarded;
                user.level = Math.floor(user.xp / 100) + 1;
            }
            await user.save();
            userXpAfter = user.xp;

            if (xpAwarded > 0) {
                const dayStamp = new Date().toISOString().slice(0, 10);
                const idempotencyKey = isFirstCompletion
                    ? `visualizer_session:${session._id}`
                    : `visualizer_partial:${visualizer._id}:${req.user.id}:${dayStamp}`;
                try {
                    await creditActivityXp({
                        userId: user._id,
                        idempotencyKey,
                        source: 'visualizer_xp',
                        title: 'Concept Visualizer XP reward',
                        xpReward: xpAwarded,
                        userXpAfterAward: user.xp,
                        metadata: { payoutType, gameId: visualizer.gameId },
                    });
                } catch (schErr) {
                    logger.error('[visualizer] creditActivityXp', { error: schErr.message });
                }
            }
        }

        const student = await User.findById(req.user.id).select('schoolId');
        trackEvent(
            'visualizer_session_completed',
            {
                score: parsedScore,
                accuracyPct: parsedAccuracy,
                xpAwarded,
                isFirstCompletion,
                payoutType,
                gameId: visualizer.gameId,
            },
            {
                actorUserId: req.user.id,
                subjectStudentId: req.user.id,
                schoolId: student?.schoolId,
                correlationId: String(session._id),
            },
        ).catch(() => {});

        res.json({
            session,
            xpAwarded,
            isFirstCompletion,
            payoutType,
            isPracticeOnly: reward.isPracticeOnly,
            nextPartialAvailableAt: reward.nextPartialAvailableAt,
            userXp: userXpAfter,
            level: userXpAfter != null ? Math.floor(userXpAfter / 100) + 1 : undefined,
        });
    } catch (err) {
        logger.error('[completeSession]', { error: err.message });
        res.status(500).json({ message: 'Server error while completing visualizer session' });
    }
};

module.exports = {
    listVisualizers,
    getVisualizer,
    startSession,
    completeSession,
};
