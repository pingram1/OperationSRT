const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Mongoose Schema for an Achievement/Badge.
 * This defines the structure for achievements that students can earn.
 */
const AchievementSchema = new Schema({
    /**
     * The student who earned this achievement.
     */
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    /**
     * The type of achievement.
     * 'first_session' - Completed first session
     * 'sessions_5' - Completed 5 sessions
     * 'sessions_10' - Completed 10 sessions
     * 'sessions_25' - Completed 25 sessions
     * 'sessions_50' - Completed 50 sessions
     * 'subject_master' - Mastered a subject
     * 'perfect_attendance' - Perfect attendance
     * 'early_bird' - Booked session early
     * 'homework_hero' - Completed all homework
     */
    type: {
        type: String,
        enum: [
            'first_session',
            'sessions_5',
            'sessions_10',
            'sessions_25',
            'sessions_50',
            'sessions_100',
            'subject_master',
            'perfect_attendance',
            'early_bird',
            'homework_hero',
            'improvement_star',
            'dedication_award',
        ],
        required: true,
    },

    /**
     * The name of the achievement.
     */
    name: {
        type: String,
        required: true,
    },

    /**
     * The description of the achievement.
     */
    description: {
        type: String,
        required: true,
    },

    /**
     * The icon/emoji for the achievement.
     */
    icon: {
        type: String,
        default: '🏆',
    },

    /**
     * The category of the achievement.
     */
    category: {
        type: String,
        enum: ['milestone', 'subject', 'attendance', 'homework', 'improvement', 'dedication'],
        default: 'milestone',
    },

    /**
     * Additional data related to the achievement (e.g., subject name, session count).
     */
    metadata: {
        subject: String,
        sessionCount: Number,
        date: Date,
    },

}, {
    timestamps: true,
});

// Create index for efficient queries
AchievementSchema.index({ student: 1, type: 1 });
AchievementSchema.index({ student: 1, createdAt: -1 });

// Create and export the Achievement model
module.exports = mongoose.model('Achievement', AchievementSchema);












