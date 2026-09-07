const mongoose = require('mongoose');
const {
    DIFFICULTY_LEVELS,
    baseXpForDifficulty,
} = require('../constants/activityRewards');

const Schema = mongoose.Schema;

const VisualizerSchema = new Schema({
    gameId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    subject: {
        type: String,
        required: true,
        enum: ['Math', 'Science', 'History', 'English', 'Computer Science'],
        default: 'English',
    },
    difficulty: {
        type: String,
        enum: DIFFICULTY_LEVELS, // Easy | Medium | Hard | Post-Grad
        default: 'Easy',
    },
    // Grade levels this visualizer is appropriate for (parity with Challenge).
    gradeLevels: [{
        type: String,
        enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'College', 'Independent Learner'],
    }],
    baseXp: {
        type: Number,
        required: true,
        default: 250,
        min: 0,
    },
    componentKey: {
        type: String,
        required: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

VisualizerSchema.index({ subject: 1, difficulty: 1, isActive: 1 });
VisualizerSchema.index({ gradeLevels: 1 });

/**
 * Default baseXp from difficulty when not explicitly provided.
 */
VisualizerSchema.pre('validate', function setVisualizerRewardDefaults(next) {
    if ((this.baseXp == null) && this.difficulty) {
        this.baseXp = baseXpForDifficulty(this.difficulty, 250);
    }
    next();
});

module.exports = mongoose.model('Visualizer', VisualizerSchema);
