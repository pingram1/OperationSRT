const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Mongoose Schema for Parent Link Requests.
 * This stores pending requests from parents to link to student accounts.
 */
const ParentLinkRequestSchema = new Schema({
    /**
     * The parent who sent the request.
     */
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    /**
     * The student who should receive the request.
     */
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    /**
     * The status of the request.
     * 'pending' - Student hasn't responded yet
     * 'accepted' - Student accepted the request
     * 'rejected' - Student rejected the request
     * 'cancelled' - Parent cancelled the request
     */
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'cancelled'],
        default: 'pending',
    },

    /**
     * Optional message from the parent.
     */
    message: {
        type: String,
        default: '',
    },

}, {
    timestamps: true,
});

// Create indexes for efficient queries
ParentLinkRequestSchema.index({ parent: 1, student: 1 });
ParentLinkRequestSchema.index({ student: 1, status: 1 });
ParentLinkRequestSchema.index({ parent: 1, status: 1 });

// Prevent duplicate pending requests
ParentLinkRequestSchema.index({ parent: 1, student: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

// Create and export the ParentLinkRequest model
module.exports = mongoose.model('ParentLinkRequest', ParentLinkRequestSchema);












