const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * In-app notifications for employees (tutors, admins, super_admins).
 * Used for missed session requests, no-shows, and other actionable alerts.
 */
const NotificationSchema = new Schema({
    /**
     * The user who receives this notification
     */
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    /**
     * Type of notification for filtering/display
     * 'session_requested' - New session proposed to tutor (needs acceptance)
     * 'request_expired' - Session request passed without tutor acceptance
     * 'no_show' - Booked session had neither party show
     */
    type: {
        type: String,
        enum: ['session_requested', 'request_expired', 'no_show'],
        required: true,
    },
    /**
     * Human-readable message
     */
    message: {
        type: String,
        required: true,
    },
    /**
     * Related booking (if applicable)
     */
    booking: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        default: null,
    },
    /**
     * Whether the user has read/acknowledged this notification
     */
    read: {
        type: Boolean,
        default: false,
    },
    /**
     * Optional action URL (e.g. link to reschedule page)
     */
    actionUrl: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
});

NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
