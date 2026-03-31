const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Mongoose Schema for System Configuration.
 * Stores platform-wide settings that affect the entire application.
 * There should only be one document in this collection.
 */
const SystemConfigSchema = new Schema({
    /**
     * Platform Status Settings
     */
    maintenanceMode: {
        type: Boolean,
        default: false,
    },
    maintenanceMessage: {
        type: String,
        default: "We are currently performing scheduled maintenance. We'll be back online shortly!",
    },
    
    /**
     * Business Settings
     */
    businessHours: {
        type: String,
        default: "Mon - Fri, 9:00 AM - 8:00 PM EST",
    },
    contactEmail: {
        type: String,
        default: "support@startright.com",
    },
    
    /**
     * Tutor Schedule Settings
     * Default schedule that applies to all tutors (can be overridden per tutor)
     */
    tutorSchedule: {
        // Weekly schedule with time slots
        weeklySchedule: [{
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                required: true,
            },
            available: {
                type: Boolean,
                default: true,
            },
            startTime: {
                type: String, // Format: "HH:MM" (24-hour format, e.g., "09:00")
                default: "09:00",
            },
            endTime: {
                type: String, // Format: "HH:MM" (24-hour format, e.g., "20:00")
                default: "20:00",
            },
        }],
        // Timezone for the schedule
        timezone: {
            type: String,
            default: "America/New_York", // EST/EDT
        },
        // Notes or additional information about the schedule
        notes: {
            type: String,
            default: "",
        },
    },
    
    /**
     * Subjects Offered
     * List of available tutoring subjects
     */
    subjects: [{
        type: String,
        trim: true,
    }],
    
    /**
     * Last updated by (admin user)
     */
    lastUpdatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },

    /**
     * Matching algorithm weights (from feedback optimization)
     * When set, overrides default 40/30/30 for style/subject/teaching
     */
    matchingWeights: {
        styleCompatibility: { type: Number, default: null },
        subjectMatch: { type: Number, default: null },
        teachingAlignment: { type: Number, default: null },
    },
    
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

// Ensure only one system config document exists
SystemConfigSchema.statics.getConfig = async function() {
    let config = await this.findOne();
    if (!config) {
        // Create default config if none exists
        config = new this({
            tutorSchedule: {
                weeklySchedule: [
                    { day: 'Monday', available: true, startTime: '09:00', endTime: '20:00' },
                    { day: 'Tuesday', available: true, startTime: '09:00', endTime: '20:00' },
                    { day: 'Wednesday', available: true, startTime: '09:00', endTime: '20:00' },
                    { day: 'Thursday', available: true, startTime: '09:00', endTime: '20:00' },
                    { day: 'Friday', available: true, startTime: '09:00', endTime: '20:00' },
                    { day: 'Saturday', available: false, startTime: '09:00', endTime: '17:00' },
                    { day: 'Sunday', available: false, startTime: '09:00', endTime: '17:00' },
                ],
                timezone: 'America/New_York',
                notes: '',
            },
            subjects: ['Algebra', 'Geometry', 'Chemistry', 'Physics', 'English Literature', 'History'],
        });
        await config.save();
    }
    return config;
};

// Create and export the SystemConfig model
module.exports = mongoose.model('SystemConfig', SystemConfigSchema);

