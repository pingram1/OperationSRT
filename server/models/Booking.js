const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Mongoose Schema for a Booking.
 * This defines the structure for each booking document in the 'bookings' collection.
 */
const BookingSchema = new Schema({
    /**
     * The user who initiated the booking (could be a parent or a student booking for themselves).
     * This establishes a reference to a document in the 'users' collection.
     */
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    /**
     * The student for whom the session is booked.
     * This is especially important for parents booking on behalf of their children.
     * This also references a document in the 'users' collection.
     */
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    /**
     * The tutor assigned to the session.
     * References a document in the 'users' collection.
     */
    tutor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    /**
     * The subject of the tutoring session (e.g., 'Algebra', 'Chemistry').
     */
    subject: {
        type: String,
        required: true,
    },

    /**
     * Specific learning goals or topics the user wants to cover in the session.
     */
    goals: {
        type: String,
        required: true,
    },

    /**
     * The scheduled date and time for the tutoring session.
     */
    sessionDate: {
        type: Date,
        required: true,
    },

    /**
     * The duration of the session in minutes.
     */
    duration: {
        type: Number,
        required: true, // e.g., 30, 60, 90
    },

    /**
     * The type of service booked, corresponding to the frontend options.
     */
    serviceType: {
        type: String,
        enum: ['solo', 'group', 'consult'],
        required: true,
    },
    
    /**
     * The current status of the booking.
     * 'scheduled' - The appointment is set.
     * 'completed' - The session has finished.
     * 'cancelled' - The session was cancelled by the user or tutor.
     */
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled',
    },

}, {
    // This option automatically adds `createdAt` and `updatedAt` fields to the schema.
    timestamps: true,
});

// Create and export the Booking model
// Mongoose will create a collection named 'bookings' (plural and lowercase) in MongoDB.
module.exports = mongoose.model('Booking', BookingSchema);