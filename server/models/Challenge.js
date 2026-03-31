const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Challenge Schema - Defines the structure for challenges
 * Supports multiple challenge types: speed-run, accuracy, identification, matching, troubleshooting, analysis
 */
const ChallengeSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
        enum: ['Math', 'Science', 'History', 'English', 'Computer Science'],
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard'],
    },
    challengeType: {
        type: String,
        required: true,
        enum: ['speed-run', 'accuracy', 'identification', 'matching', 'troubleshooting', 'analysis'],
    },
    xpReward: {
        type: Number,
        required: true,
        default: 25,
    },
    // Time limit in seconds (for speed-run challenges)
    timeLimit: {
        type: Number,
        default: null,
    },
    // Questions/items for the challenge
    questions: [{
        question: {
            type: String,
            required: true,
        },
        questionType: {
            type: String,
            enum: ['multiple_choice', 'true_false', 'fill_in_the_blank', 'matching', 'error_detection'],
            default: 'multiple_choice',
        },
        options: [String], // For multiple choice / optional labels
        correctAnswer: Schema.Types.Mixed, // string | boolean | object | number — depends on questionType
        explanation: String, // Explanation shown after answering
        points: {
            type: Number,
            default: 1,
        },
        fillTemplate: String,
        caseSensitive: {
            type: Boolean,
            default: false,
        },
        matchingPairs: [{
            left: String,
            right: String,
        }],
        errorSentence: String,
        errorWordIndex: Number,
    }],
    // For matching challenges
    matchingPairs: [{
        left: String,
        right: String,
    }],
    // For troubleshooting challenges
    codeBlocks: [{
        code: String,
        language: String,
        hasError: Boolean,
        errorType: String,
        correctCode: String,
    }],
    // Minimum score/accuracy required to pass
    passingScore: {
        type: Number,
        default: 70, // Percentage
    },
    // Number of questions required (for accuracy gauntlet)
    requiredStreak: {
        type: Number,
        default: null,
    },
    // Grade levels this challenge is appropriate for
    gradeLevels: [{
        type: String,
        enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'College', 'Independent Learner'],
    }],
    // Active status
    isActive: {
        type: Boolean,
        default: true,
    },
    // Metadata
    tags: [String],
    estimatedDuration: {
        type: Number, // in minutes
        default: 10,
    },
}, {
    timestamps: true,
});

// Index for efficient queries
ChallengeSchema.index({ subject: 1, difficulty: 1, isActive: 1 });

module.exports = mongoose.model('Challenge', ChallengeSchema);

