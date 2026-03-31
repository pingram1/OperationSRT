const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Mongoose Schema for Announcements.
 * Announcements can be sent to all users or targeted to specific roles.
 */
const AnnouncementSchema = new Schema({
    /**
     * The title of the announcement
     */
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        trim: true,
    },
    
    /**
     * The message content of the announcement
     */
    message: {
        type: String,
        required: [true, 'Please provide a message'],
        trim: true,
    },
    
    /**
     * The target audience for this announcement
     * 'all' - All users
     * 'students' - Only students
     * 'parents' - Only parents
     * 'tutors' - Only tutors
     * 'admin' - Only admins
     */
    audience: {
        type: String,
        enum: ['all', 'students', 'parents', 'tutors', 'admin'],
        default: 'all',
        required: true,
    },
    
    /**
     * The user who created this announcement (admin)
     */
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    
    /**
     * Whether this announcement is still active/visible
     */
    isActive: {
        type: Boolean,
        default: true,
    },
    
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

// Create and export the Announcement model
module.exports = mongoose.model('Announcement', AnnouncementSchema);

