const Challenge = require('../models/Challenge');
const ChallengeAttempt = require('../models/ChallengeAttempt');
const User = require('../models/User');
const { checkAnswer } = require('../utils/challengeAnswerCheck');
const { creditActivityXp } = require('../services/scholarshipService');
const { trackEvent } = require('../services/telemetryService');
const {
    evaluateActivityAttempt,
    previewActivityReward,
    getProgressMap,
} = require('../services/activityRewardService');
const { baseXpForDifficulty } = require('../constants/activityRewards');

/**
 * Resolve the effective base XP for a challenge (new baseXp field, with
 * fallbacks for legacy docs that predate the reward-engine migration).
 */
function challengeBaseXp(challenge) {
    if (challenge.baseXp != null) return challenge.baseXp;
    return baseXpForDifficulty(challenge.difficulty, challenge.xpReward || 0);
}

/**
 * Evaluate + apply a challenge completion through the time-throttled engine.
 * Mutates `attempt` (xpEarned/payoutType/rewardEvaluated) but does not save it.
 * Returns the engine decision.
 */
async function applyChallengeReward(userId, challenge, attempt) {
    const baseXp = challengeBaseXp(challenge);
    const result = await evaluateActivityAttempt({
        userId,
        activityType: 'challenge',
        activityId: challenge._id,
        baseXp,
    });

    attempt.xpEarned = result.xpAwarded;
    attempt.payoutType = result.payoutType;
    attempt.rewardEvaluated = true;

    if (result.xpAwarded > 0) {
        const user = await User.findById(userId);
        if (user) {
            user.xp += result.xpAwarded;
            if (result.isFirstCompletion) {
                user.challengesCompleted += 1;
            }
            user.level = Math.floor(user.xp / 100) + 1;
            await user.save();

            const dayStamp = new Date().toISOString().slice(0, 10);
            const idempotencyKey = result.isFirstCompletion
                ? `challenge_attempt:${attempt._id}`
                : `challenge_partial:${challenge._id}:${userId}:${dayStamp}`;

            try {
                await creditActivityXp({
                    userId: user._id,
                    idempotencyKey,
                    source: 'challenge_xp',
                    title: 'Challenge XP reward',
                    xpReward: result.xpAwarded,
                    userXpAfterAward: user.xp,
                    metadata: { payoutType: result.payoutType, challengeId: String(challenge._id) },
                });
            } catch (schErr) {
                console.error('[scholarship] creditActivityXp', schErr.message);
            }
        }
    }

    return result;
}

function emitChallengeAttemptCompleted(actorUserId, challenge, attempt) {
    const outcome = attempt.status === 'completed' ? 'success' : 'fail';
    trackEvent(
        'challenge_attempt_completed',
        {
            outcome,
            scorePct: attempt.percentage,
            timeOnTaskSec: attempt.timeSpent != null ? attempt.timeSpent : null,
            totalQuestions: Array.isArray(challenge?.questions) ? challenge.questions.length : null,
        },
        { actorUserId: actorUserId },
    ).catch(() => {});
}

/**
 * @desc    Get all challenges (with optional filters)
 * @route   GET /api/challenges
 * @access  Public (students can view challenges)
 */
const getAllChallenges = async (req, res) => {
    try {
        const { subject, difficulty, status, gradeLevel, includeInactive } = req.query;
        
        // Admins can see inactive challenges if includeInactive is true
        const query = {};
        if (req.user) {
            const User = require('../models/User');
            const user = await User.findById(req.user.id);
            if (user && (user.role === 'admin' || user.role === 'super_admin') && includeInactive === 'true') {
                // Admin viewing all challenges (including inactive)
                // Don't filter by isActive
            } else {
                // Regular users or admin viewing active only
                query.isActive = true;
            }
        } else {
            // Non-authenticated users only see active challenges
            query.isActive = true;
        }
        
        if (subject) query.subject = subject;
        if (difficulty) query.difficulty = difficulty;
        if (gradeLevel) query.gradeLevels = { $in: [gradeLevel] };

        const challenges = await Challenge.find(query).sort({ createdAt: -1 });

        // Per-activity reward ledger for the current user (for badge previews)
        let progressByActivity = {};
        if (req.user) {
            progressByActivity = await getProgressMap(
                req.user.id,
                'challenge',
                challenges.map((c) => c._id),
            );
        }

        // Always return challenges with status field
        // If user is logged in, get their attempt status for each challenge
        // IMPORTANT: Get the most relevant attempt for each challenge, prioritizing completed attempts
        let attempts = [];
        if (req.user) {
            const challengeIds = challenges.map(c => c._id);
            // Get all attempts for these challenges (including all statuses)
            // We'll process them to find the most relevant one for each challenge
            attempts = await ChallengeAttempt.find({
                user: req.user.id,
                challenge: { $in: challengeIds },
            })
            .sort({ createdAt: -1 }); // Newest first, but we'll prioritize by status
            
            // Debug: Log all attempts found
            console.log(`[getAllChallenges] Found ${attempts.length} attempts for user ${req.user.id} across ${challengeIds.length} challenges`);
            if (attempts.length > 0) {
                console.log(`[getAllChallenges] Sample attempt:`, {
                    id: attempts[0]._id,
                    challenge: attempts[0].challenge.toString(),
                    status: attempts[0].status,
                    user: attempts[0].user.toString()
                });
            }
            
            // Log attempts for Punctuation Pro specifically
            const punctuationProChallenge = challenges.find(c => c.title === 'Punctuation Pro');
            if (punctuationProChallenge) {
                const punctuationProChallengeId = punctuationProChallenge._id.toString();
                const punctuationAttempts = attempts.filter(a => {
                    const attemptChallengeId = a.challenge.toString();
                    return attemptChallengeId === punctuationProChallengeId;
                });
                console.log(`[getAllChallenges] Punctuation Pro (${punctuationProChallengeId}) attempts found:`, punctuationAttempts.length);
                if (punctuationAttempts.length > 0) {
                    punctuationAttempts.forEach(a => {
                        console.log(`  - Attempt ${a._id}: status="${a.status}", xpEarned=${a.xpEarned || 0}, createdAt=${a.createdAt}, challenge=${a.challenge.toString()}, percentage=${a.percentage || 0}`);
                    });
                } else {
                    console.log(`[getAllChallenges] WARNING: No attempts found for Punctuation Pro! Challenge ID: ${punctuationProChallengeId}`);
                    // Debug: Check if challenge ID matches
                    attempts.forEach(a => {
                        console.log(`  - Available attempt: challenge=${a.challenge.toString()}, status=${a.status}`);
                    });
                }
            }
        }

        // Create a map that stores the most relevant attempt for each challenge
        // Priority: completed (any, prefer newest) > in-progress (newest) > failed/abandoned
        const attemptsMap = {};
        
        // First pass: collect all attempts by challenge
        // Convert challenge ObjectIds to strings for consistent comparison
        const attemptsByChallenge = {};
        attempts.forEach(attempt => {
            // attempt.challenge is a Mongoose ObjectId reference - convert to string
            const challengeId = attempt.challenge.toString();
            if (!attemptsByChallenge[challengeId]) {
                attemptsByChallenge[challengeId] = [];
            }
            attemptsByChallenge[challengeId].push(attempt);
            
            // Debug log for Punctuation Pro
            if (attempt.status === 'completed') {
                const punctuationProChallenge = challenges.find(c => c.title === 'Punctuation Pro');
                if (punctuationProChallenge && challengeId === punctuationProChallenge._id.toString()) {
                    console.log(`[getAllChallenges] Found completed attempt for Punctuation Pro:`, {
                        attemptId: attempt._id,
                        challengeId: challengeId,
                        status: attempt.status,
                        xpEarned: attempt.xpEarned
                    });
                }
            }
        });
        
        // Debug: Log how many challenges have attempts
        console.log(`[getAllChallenges] Attempts grouped by ${Object.keys(attemptsByChallenge).length} challenges`);
        
        // Second pass: for each challenge, select the best attempt
        Object.keys(attemptsByChallenge).forEach(challengeId => {
            const challengeAttempts = attemptsByChallenge[challengeId];
            
            // Debug: Log all statuses for this challenge
            const statuses = challengeAttempts.map(a => a.status);
            const challenge = challenges.find(c => c._id.toString() === challengeId);
            if (challenge && challenge.title === 'Punctuation Pro') {
                console.log(`[getAllChallenges] Punctuation Pro challenge attempts statuses:`, statuses);
            }
            
            // Find completed attempts first (prefer newest)
            const completedAttempts = challengeAttempts.filter(a => {
                const isCompleted = a.status === 'completed';
                if (challenge && challenge.title === 'Punctuation Pro' && isCompleted) {
                    console.log(`[getAllChallenges] Found completed attempt for Punctuation Pro:`, {
                        attemptId: a._id,
                        status: a.status,
                        xpEarned: a.xpEarned,
                        percentage: a.percentage
                    });
                }
                return isCompleted;
            });
            
            if (completedAttempts.length > 0) {
                // Use the most recent completed attempt
                attemptsMap[challengeId] = completedAttempts[0]; // Already sorted by createdAt DESC
                if (challenge && challenge.title === 'Punctuation Pro') {
                    console.log(`[getAllChallenges] ✅ Selected completed attempt for Punctuation Pro:`, {
                        attemptId: completedAttempts[0]._id,
                        status: completedAttempts[0].status,
                        xpEarned: completedAttempts[0].xpEarned,
                        challengeId: challengeId
                    });
                }
                return;
            }
            
            // No completed attempts - find in-progress attempts (prefer newest)
            const inProgressAttempts = challengeAttempts.filter(a => a.status === 'in-progress');
            if (inProgressAttempts.length > 0) {
                attemptsMap[challengeId] = inProgressAttempts[0]; // Already sorted by createdAt DESC
                if (challenge && challenge.title === 'Punctuation Pro') {
                    console.log(`[getAllChallenges] ⚠️ Selected in-progress attempt for Punctuation Pro (no completed found)`);
                }
                return;
            }
            
            // No completed or in-progress - use the most recent attempt (might be failed)
            attemptsMap[challengeId] = challengeAttempts[0];
            if (challenge && challenge.title === 'Punctuation Pro') {
                console.log(`[getAllChallenges] ⚠️ Selected failed/other attempt for Punctuation Pro:`, {
                    status: challengeAttempts[0].status
                });
            }
        });

        const challengesWithStatus = challenges.map(challenge => {
            // Convert challenge._id to string for consistent comparison
            const challengeIdStr = challenge._id.toString();
            const attempt = attemptsMap[challengeIdStr];
            let status = 'new';
            let progress = 0;

            if (attempt) {
                if (attempt.status === 'completed') {
                    status = 'completed';
                    progress = 100;
                    // Log for debugging
                    console.log(`[getAllChallenges] Challenge "${challenge.title}" (${challengeIdStr}) mapped to status="${status}" from attempt ${attempt._id} with status="${attempt.status}"`);
                } else if (attempt.status === 'in-progress') {
                    status = 'inprogress';
                    progress = attempt.currentQuestion > 0 
                        ? Math.round((attempt.currentQuestion / challenge.questions.length) * 100)
                        : 0;
                } else if (attempt.status === 'failed') {
                    // Failed attempts should show as "new" so user can try again
                    status = 'new';
                    progress = 0;
                }
            } else {
                // No attempt found - log for debugging
                if (challenge.title === 'Punctuation Pro') {
                    console.log(`[getAllChallenges] Challenge "${challenge.title}" (${challengeIdStr}) has NO attempts in attemptsMap. Available challenge IDs in map:`, Object.keys(attemptsMap));
                }
            }

            const baseXp = challengeBaseXp(challenge);
            const result = {
                ...challenge.toObject(),
                status,
                progress,
                baseXp,
                reward: previewActivityReward(progressByActivity[challengeIdStr], baseXp),
            };
            
            // CRITICAL DEBUG: Log final status for Punctuation Pro
            if (challenge.title === 'Punctuation Pro') {
                console.log(`[getAllChallenges] 🔍 FINAL STATUS CHECK for "${challenge.title}":`, {
                    finalStatus: result.status,
                    hasAttempt: !!attempt,
                    attemptStatus: attempt?.status,
                    attemptId: attempt?._id,
                    challengeId: challengeIdStr,
                    attemptsMapKeys: Object.keys(attemptsMap),
                    attemptsMapHasThisChallenge: challengeIdStr in attemptsMap
                });
                
                // Double-check: Query database directly for this challenge
                if (req.user) {
                    ChallengeAttempt.find({
                        user: req.user.id,
                        challenge: challenge._id,
                        status: 'completed'
                    }).then(directCompletedAttempts => {
                        console.log(`[getAllChallenges] 🔍 DIRECT DB QUERY for Punctuation Pro completed attempts:`, directCompletedAttempts.length);
                        if (directCompletedAttempts.length > 0) {
                            console.log(`[getAllChallenges] ⚠️⚠️⚠️ FOUND ${directCompletedAttempts.length} COMPLETED ATTEMPTS BUT STATUS IS ${result.status} ⚠️⚠️⚠️`);
                        }
                    }).catch(err => {
                        console.error(`[getAllChallenges] Error in direct query:`, err);
                    });
                }
            }
            
            return result;
        });

        return res.json(challengesWithStatus);
    } catch (err) {
        console.error('Error fetching challenges:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Get a single challenge by ID
 * @route   GET /api/challenges/:id
 * @access  Public
 */
const getChallengeById = async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        // Get user's attempt if logged in
        // Prioritize completed attempts, then in-progress
        let attempt = null;
        if (req.user) {
            // First try to get a completed attempt
            attempt = await ChallengeAttempt.findOne({
                user: req.user.id,
                challenge: challenge._id,
                status: 'completed',
            }).sort({ createdAt: -1 });
            
            // If no completed attempt, get in-progress attempt
            if (!attempt) {
                attempt = await ChallengeAttempt.findOne({
                    user: req.user.id,
                    challenge: challenge._id,
                    status: 'in-progress',
                }).sort({ createdAt: -1 });
            }
        }

        const baseXp = challengeBaseXp(challenge);
        let reward = previewActivityReward(null, baseXp);
        if (req.user) {
            const progressMap = await getProgressMap(req.user.id, 'challenge', [challenge._id]);
            reward = previewActivityReward(progressMap[challenge._id.toString()], baseXp);
        }

        res.json({
            challenge,
            attempt,
            baseXp,
            reward,
        });
    } catch (err) {
        console.error('Error fetching challenge:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Start a challenge (create attempt)
 * @route   POST /api/challenges/:id/start
 * @access  Private
 */
const startChallenge = async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        // Check if user already has an active attempt
        let attempt = await ChallengeAttempt.findOne({
            user: req.user.id,
            challenge: challenge._id,
            status: 'in-progress',
        });

        if (attempt) {
            // Return existing attempt
            return res.json({ attempt, challenge });
        }

        const priorAttemptCount = await ChallengeAttempt.countDocuments({
            user: req.user.id,
            challenge: challenge._id,
        });

        // Create new attempt
        attempt = new ChallengeAttempt({
            user: req.user.id,
            challenge: challenge._id,
            status: 'in-progress',
            totalPoints: challenge.questions.reduce((sum, q) => sum + (q.points || 1), 0),
        });

        await attempt.save();

        trackEvent(
            'challenge_attempt_started',
            {
                challengeId: challenge._id.toString(),
                attemptId: attempt._id.toString(),
                attemptOrdinal: priorAttemptCount + 1,
            },
            { actorUserId: req.user.id },
        ).catch(() => {});

        res.json({ attempt, challenge });
    } catch (err) {
        console.error('Error starting challenge:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Submit an answer for a challenge
 * @route   POST /api/challenges/:id/answer
 * @access  Private
 */
const submitAnswer = async (req, res) => {
    try {
        const { questionIndex, answer, timeSpent } = req.body;
        const challenge = await Challenge.findById(req.params.id);
        
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        let attempt = await ChallengeAttempt.findOne({
            user: req.user.id,
            challenge: challenge._id,
            status: 'in-progress',
        });

        if (!attempt) {
            return res.status(404).json({ message: 'No active attempt found' });
        }

        const question = challenge.questions[questionIndex];
        if (!question) {
            return res.status(400).json({ message: 'Invalid question index' });
        }

        // Check if answer is correct
        const isCorrect = checkAnswer(question, answer);
        const pointsEarned = isCorrect ? (question.points || 1) : 0;

        // Update streak
        if (isCorrect) {
            attempt.currentStreak += 1;
            if (attempt.currentStreak > attempt.bestStreak) {
                attempt.bestStreak = attempt.currentStreak;
            }
        } else {
            attempt.currentStreak = 0;
        }

        // Add answer to attempt
        attempt.answers.push({
            questionIndex,
            answer,
            isCorrect,
            pointsEarned,
            timeSpent: timeSpent || 0,
        });

        attempt.score += pointsEarned;
        attempt.currentQuestion = questionIndex + 1;
        attempt.percentage = Math.round((attempt.score / attempt.totalPoints) * 100);

        // Check if challenge is complete
        if (attempt.currentQuestion >= challenge.questions.length) {
            attempt.status = attempt.percentage >= challenge.passingScore ? 'completed' : 'failed';
            attempt.endTime = new Date();
            
            // Only calculate timeSpent if not already set (to avoid accumulating time incorrectly)
            // Time should be calculated based on actual session time, not total elapsed time
            if (!attempt.timeSpent || attempt.timeSpent === 0) {
                // Use the timeSpent from the last answer submission if available
                // Otherwise calculate from start to end (though this may not be accurate for sessions)
                const lastAnswer = attempt.answers[attempt.answers.length - 1];
                if (lastAnswer && lastAnswer.timeSpent) {
                    // Sum up all answer timeSpent values for more accurate total
                    attempt.timeSpent = attempt.answers.reduce((sum, ans) => sum + (ans.timeSpent || 0), 0);
                } else {
                    attempt.timeSpent = Math.floor((attempt.endTime - attempt.startTime) / 1000);
                }
            }

            // Award XP via the time-throttled reward engine (once per attempt)
            if (attempt.status === 'completed' && !attempt.rewardEvaluated) {
                await applyChallengeReward(req.user.id, challenge, attempt);
            }
        }

        await attempt.save();

        const elapsedSinceAttemptStartMs = attempt.startTime
            ? Date.now() - new Date(attempt.startTime).getTime()
            : null;

        trackEvent(
            'challenge_answer_submitted',
            {
                questionIndex,
                isCorrect,
                elapsedSinceAttemptStartMs,
                itemId: String(questionIndex),
            },
            { actorUserId: req.user.id },
        ).catch(() => {});

        if (attempt.status === 'completed' || attempt.status === 'failed') {
            emitChallengeAttemptCompleted(req.user.id, challenge, attempt);
        }

        // Log attempt status for debugging
        if (attempt.status === 'completed') {
            console.log(`[submitAnswer] Attempt ${attempt._id} saved with status 'completed' for challenge ${challenge.title}`);
        }
        
        res.json({ attempt, isCorrect, correctAnswer: question.correctAnswer, explanation: question.explanation });
    } catch (err) {
        console.error('Error submitting answer:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Complete a challenge
 * @route   POST /api/challenges/:id/complete
 * @access  Private
 */
const completeChallenge = async (req, res) => {
    try {
        // Try to find an in-progress attempt first
        let attempt = await ChallengeAttempt.findOne({
            user: req.user.id,
            challenge: req.params.id,
            status: 'in-progress',
        });

        // If no in-progress attempt, check if there's a recently completed one
        if (!attempt) {
            attempt = await ChallengeAttempt.findOne({
                user: req.user.id,
                challenge: req.params.id,
                status: { $in: ['completed', 'failed'] },
            }).sort({ createdAt: -1 });
            
            // If we found a completed attempt, return it (challenge was already completed)
            if (attempt) {
                return res.json({ attempt });
            }
            
            // No attempt found at all
            return res.status(404).json({ message: 'No attempt found for this challenge' });
        }

        const challenge = await Challenge.findById(req.params.id);

        let transitionedTerminal = false;

        // Only update if not already completed/failed
        if (attempt.status === 'in-progress') {
            attempt.status = attempt.percentage >= challenge.passingScore ? 'completed' : 'failed';
            attempt.endTime = new Date();
            
            // Calculate timeSpent from individual answer submissions (most accurate)
            if (attempt.answers && attempt.answers.length > 0) {
                const totalAnswerTime = attempt.answers.reduce((sum, ans) => sum + (ans.timeSpent || 0), 0);
                if (totalAnswerTime > 0) {
                    attempt.timeSpent = totalAnswerTime;
                } else {
                    attempt.timeSpent = Math.floor((attempt.endTime - attempt.startTime) / 1000);
                }
            } else {
                attempt.timeSpent = Math.floor((attempt.endTime - attempt.startTime) / 1000);
            }

            // Award XP via the time-throttled reward engine (once per attempt)
            if (attempt.status === 'completed' && !attempt.rewardEvaluated) {
                await applyChallengeReward(req.user.id, challenge, attempt);
            }

            transitionedTerminal = true;
        }

        await attempt.save();

        if (transitionedTerminal) {
            emitChallengeAttemptCompleted(req.user.id, challenge, attempt);
        }

        res.json({ attempt });
    } catch (err) {
        console.error('Error completing challenge:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Get leaderboard
 * @route   GET /api/challenges/leaderboard
 * @access  Public
 */
const getLeaderboard = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const leaders = await User.find({ role: 'student' })
            .select('name avatar xp level challengesCompleted')
            .sort({ xp: -1 })
            .limit(parseInt(limit));

        res.json(leaders);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Create a new challenge (Admin only)
 * @route   POST /api/challenges
 * @access  Private (Admin only)
 */
const createChallenge = async (req, res) => {
    try {
        // Check if user is admin
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can create challenges' });
        }

        const challengeData = req.body;
        
        // Validate required fields
        if (!challengeData.title || !challengeData.description || !challengeData.subject || 
            !challengeData.difficulty || !challengeData.challengeType) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create challenge
        const challenge = new Challenge(challengeData);
        await challenge.save();

        res.status(201).json(challenge);
    } catch (err) {
        console.error('Error creating challenge:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Update a challenge (Admin only)
 * @route   PUT /api/challenges/:id
 * @access  Private (Admin only)
 */
const updateChallenge = async (req, res) => {
    try {
        // Check if user is admin
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can update challenges' });
        }

        const challenge = await Challenge.findById(req.params.id);
        
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        // Update challenge
        Object.assign(challenge, req.body);
        await challenge.save();

        res.json(challenge);
    } catch (err) {
        console.error('Error updating challenge:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Delete a challenge (Admin only)
 * @route   DELETE /api/challenges/:id
 * @access  Private (Admin only)
 */
const deleteChallenge = async (req, res) => {
    try {
        // Check if user is admin
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can delete challenges' });
        }

        const challenge = await Challenge.findById(req.params.id);
        
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        // Soft delete by setting isActive to false, or hard delete
        // For now, we'll do a hard delete, but you can change to soft delete if preferred
        await Challenge.findByIdAndDelete(req.params.id);

        res.json({ message: 'Challenge deleted successfully' });
    } catch (err) {
        console.error('Error deleting challenge:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllChallenges,
    getChallengeById,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    startChallenge,
    submitAnswer,
    completeChallenge,
    getLeaderboard,
};

