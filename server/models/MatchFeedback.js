const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * MatchFeedback Schema
 * Tracks match outcomes for continuous improvement of the matching algorithm
 */
const MatchFeedbackSchema = new Schema({
    /**
     * Reference to the booking this feedback is for
     */
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    /**
     * Reference to the student in the match
     */
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    /**
     * Reference to the tutor in the match
     */
    tutorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    /**
     * Predicted compatibility score from matching algorithm (0-1)
     */
    predictedScore: {
        type: Number,
        min: 0,
        max: 1,
        required: true,
    },
    /**
     * Actual rating normalized to 0-1 scale (from 1-5 student satisfaction)
     */
    actualRating: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
    },
    /**
     * Student satisfaction rating (1-5)
     */
    studentSatisfaction: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
    },
    /**
     * Optional feedback from tutor
     */
    tutorFeedback: {
        type: String,
        default: null,
    },
    /**
     * Overall session outcome
     */
    sessionOutcome: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', null],
        default: null,
    },
    /**
     * Progress metrics (grades improved, concepts mastered, etc.)
     */
    progressMetrics: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {},
    },
    /**
     * Who provided this feedback
     */
    feedbackBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

// Index for efficient queries
MatchFeedbackSchema.index({ studentId: 1, tutorId: 1 });
MatchFeedbackSchema.index({ bookingId: 1 });
MatchFeedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MatchFeedback', MatchFeedbackSchema);






