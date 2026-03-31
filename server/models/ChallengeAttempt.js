const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ChallengeAttempt Schema - Tracks user progress and attempts on challenges
 */
const ChallengeAttemptSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    challenge: {
        type: Schema.Types.ObjectId,
        ref: 'Challenge',
        required: true,
    },
    status: {
        type: String,
        enum: ['in-progress', 'completed', 'failed', 'abandoned'],
        default: 'in-progress',
    },
    // Answers submitted by the user
    answers: [{
        questionIndex: Number,
        answer: Schema.Types.Mixed,
        isCorrect: Boolean,
        pointsEarned: Number,
        timeSpent: Number, // in seconds
    }],
    // Progress tracking
    currentQuestion: {
        type: Number,
        default: 0,
    },
    score: {
        type: Number,
        default: 0,
    },
    totalPoints: {
        type: Number,
        default: 0,
    },
    percentage: {
        type: Number,
        default: 0,
    },
    // Time tracking
    startTime: {
        type: Date,
        default: Date.now,
    },
    endTime: {
        type: Date,
    },
    timeSpent: {
        type: Number, // Total time in seconds
        default: 0,
    },
    // XP earned
    xpEarned: {
        type: Number,
        default: 0,
    },
    // Streak tracking (for accuracy challenges)
    currentStreak: {
        type: Number,
        default: 0,
    },
    bestStreak: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

// Index for efficient queries
ChallengeAttemptSchema.index({ user: 1, challenge: 1 });
ChallengeAttemptSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('ChallengeAttempt', ChallengeAttemptSchema);

