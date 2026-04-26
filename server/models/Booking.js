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
        required: false, // Optional for consultations where tutor can be assigned later
    },

    /**
     * The subject of the tutoring session (e.g., 'Algebra', 'Chemistry').
     */
    subject: {
        type: String,
        required: true,
    },

    /**
     * Grade level for the session (e.g., '9', '10', 'College').
     */
    gradeLevel: {
        type: String,
        default: null,
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
     * The type of session - in-person or virtual.
     * 'in-person' - Physical meeting location (default, encouraged)
     * 'virtual' - Online video meeting via Whereby
     */
    sessionType: {
        type: String,
        enum: ['in-person', 'virtual'],
        default: 'in-person',
    },

    /**
     * Whereby video room information for virtual sessions.
     * Only populated when sessionType is 'virtual'.
     */
    wherebyRoom: {
        meetingId: {
            type: String,
            default: null,
        },
        roomId: {
            type: String,
            default: null,
        },
        roomUrl: {
            type: String,
            default: null,
        },
        hostRoomUrl: {
            type: String,
            default: null,
        },
        createdAt: {
            type: Date,
            default: null,
        },
    },
    
    /**
     * The current status of the booking.
     * 'scheduled' - The appointment is set.
     * 'completed' - The session has finished.
     * 'cancelled' - The session was cancelled by the user or tutor.
     * 'no_show' - Session was scheduled but neither party showed up.
     */
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
        default: 'scheduled',
    },

    /**
     * Cancellation information
     */
    cancellation: {
        cancelledAt: {
            type: Date,
            default: null,
        },
        cancelledBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        cancellationReason: {
            type: String,
            default: null,
        },
        hasPenalty: {
            type: Boolean,
            default: false,
        },
        penaltyAmount: {
            type: Number,
            default: null,
        },
    },

    /**
     * Tutor acceptance status for the booking.
     * 'pending' - Tutor has not yet accepted or declined the session.
     * 'accepted' - Tutor has accepted the session.
     * 'declined' - Tutor has declined the session.
     * 'request_expired' - Session date passed before tutor accepted; reschedule needed.
     * This field is only relevant when a tutor is assigned to the booking.
     */
    tutorAcceptanceStatus: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'request_expired', null],
        default: null,
    },

    /**
     * Payment status for payroll purposes.
     * 'Unpaid' - Session completed but not yet paid to tutor.
     * 'Paid' - Session has been paid to tutor.
     */
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Paid'],
        default: 'Unpaid',
    },

    /**
     * Customer payment information (Stripe)
     */
    customerPayment: {
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded', 'requested', null],
            default: null,
        },
        stripePaymentIntentId: {
            type: String,
            default: null,
        },
        stripeCustomerId: {
            type: String,
            default: null,
        },
        amount: {
            type: Number,
            default: null,
        },
        currency: {
            type: String,
            default: 'USD',
        },
        paidAt: {
            type: Date,
            default: null,
        },
        // Payment request information (when student cannot pay)
        paymentRequest: {
            requestedAt: {
                type: Date,
                default: null,
            },
            requestedFrom: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                default: null,
            },
            parentNotified: {
                type: Boolean,
                default: false,
            },
        },
    },

    /**
     * Session or membership charge amount (USD) set at booking creation (server-validated for membership).
     */
    price: {
        type: Number,
        default: null,
    },

    /**
     * Whether this booking record is for membership checkout vs a standard session.
     */
    paymentPurpose: {
        type: String,
        enum: ['session', 'membership'],
        default: 'session',
    },

    membershipPlanId: {
        type: Schema.Types.ObjectId,
        ref: 'MembershipPlan',
        default: null,
    },

    membershipSessionConfiguration: {
        type: Schema.Types.Mixed,
        default: null,
    },

    /**
     * Set true after membership benefits are applied following successful payment (idempotency).
     */
    membershipActivationComplete: {
        type: Boolean,
        default: false,
    },

    /**
     * Session notes written by the tutor after the session.
     * Contains information about what was covered, progress made, and recommendations.
     */
    sessionNotes: {
        topicsCovered: {
            type: String,
            default: '',
        },
        conceptsMastered: {
            type: String,
            default: '',
        },
        areasForImprovement: {
            type: String,
            default: '',
        },
        homeworkAssigned: {
            type: String,
            default: '',
        },
        nextSteps: {
            type: String,
            default: '',
        },
        generalNotes: {
            type: String,
            default: '',
        },
        notesAddedAt: {
            type: Date,
            default: null,
        },
        notesAddedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },

    /**
     * Student rating of the tutor after session completion.
     * Rating scale: 1-5 (1 = Poor, 5 = Excellent)
     * This is set by the student after the session is completed.
     */
    rating: {
        value: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        comment: {
            type: String,
            default: '',
        },
        ratedAt: {
            type: Date,
            default: null,
        },
        ratedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },

    /**
     * Match feedback for continuous improvement of matching algorithm.
     * Tracks predicted vs actual match quality.
     */
    matchFeedback: {
        predictedScore: {
            type: Number,
            min: 0,
            max: 1,
            default: null,
        },
        actualRating: {
            type: Number,
            min: 0,
            max: 1,
            default: null,
        },
        breakdown: {
            styleCompatibility: { type: Number, default: null },
            subjectMatch: { type: Number, default: null },
            teachingAlignment: { type: Number, default: null },
        },
        studentSatisfaction: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        tutorFeedback: {
            type: String,
            default: null,
        },
        sessionOutcome: {
            type: String,
            enum: ['excellent', 'good', 'fair', 'poor', null],
            default: null,
        },
        progressMetrics: {
            type: Map,
            of: Schema.Types.Mixed,
            default: {},
        },
        feedbackDate: {
            type: Date,
            default: null,
        },
        feedbackBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },

}, {
    // This option automatically adds `createdAt` and `updatedAt` fields to the schema.
    timestamps: true,
});

// Add indexes for frequently queried fields
BookingSchema.index({ user: 1, sessionDate: -1 });
BookingSchema.index({ student: 1, sessionDate: -1 });
BookingSchema.index({ tutor: 1, sessionDate: -1 });
BookingSchema.index({ status: 1, sessionDate: -1 });
BookingSchema.index({ sessionDate: 1 });
BookingSchema.index({ createdAt: -1 });

// Create and export the Booking model
// Mongoose will create a collection named 'bookings' (plural and lowercase) in MongoDB.
module.exports = mongoose.model('Booking', BookingSchema);