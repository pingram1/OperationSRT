const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Mongoose Schema for Membership Plans.
 * Defines the structure for membership tier data.
 */
const MembershipPlanSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['Summa Cum Laude', 'Magna Cum Laude', 'Cum Laude'],
    },
    subtitle: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    priceType: {
        type: String,
        enum: ['monthly', 'per_session', 'free'],
        required: true,
    },
    priceDisplay: {
        type: String, // e.g., "$259.99/mo" or "$65/session"
        required: true,
    },
    features: [{
        type: String,
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    // For Summa Cum Laude: session configuration
    sessionConfig: {
        baseSessionsPerWeek: {
            type: Number,
            default: 1,
        },
        baseSessionDuration: {
            type: Number, // in minutes
            default: 60,
        },
        sessionsPerMonth: {
            type: Number,
            default: 4,
        },
        // Options for additional sessions
        additionalSessionOptions: {
            type: [{
                label: String, // e.g., "2 hours per week" or "2 one-hour sessions"
                sessionsPerWeek: Number,
                sessionDuration: Number, // in minutes
                additionalCost: Number, // additional monthly cost
            }],
            default: [],
        },
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('MembershipPlan', MembershipPlanSchema);

