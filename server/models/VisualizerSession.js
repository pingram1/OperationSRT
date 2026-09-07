const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const VisualizerSessionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    visualizer: {
        type: Schema.Types.ObjectId,
        ref: 'Visualizer',
        required: true,
        index: true,
    },
    gameId: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed'],
        default: 'in_progress',
    },
    score: {
        type: Number,
        default: 0,
    },
    accuracy: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    xpAwarded: {
        type: Number,
        default: 0,
        min: 0,
    },
    isFirstCompletion: {
        type: Boolean,
        default: false,
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

VisualizerSessionSchema.index({ user: 1, visualizer: 1, createdAt: -1 });
VisualizerSessionSchema.index({ user: 1, gameId: 1, createdAt: -1 });

module.exports = mongoose.model('VisualizerSession', VisualizerSessionSchema);
