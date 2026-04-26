/*const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
    },
    role: {
        type: String,
        enum: ['student', 'parent', 'tutor', 'admin', 'super_admin'],
        default: 'student',
    },
    // For super_admin: allow them to function as a tutor
    availableAsTutor: {
        type: Boolean,
        default: false,
    },
    // ... other fields
}, {
    timestamps: true,
});

/**
 * Mongoose Pre-Save Hook for Password Hashing.
 * This function automatically runs before a new user document is saved.
 * It hashes the password if it has been modified.
 */
/*UserSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Generate a "salt" for hashing
        const salt = await bcrypt.genSalt(10);
        // Hash the password using the salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

/**
 * Mongoose Method to Compare Passwords.
 * This adds a custom method to every user document, allowing you to easily
 * compare a submitted password with the stored hash.
 * @param {string} candidatePassword - The password submitted by the user during login.
 * @returns {Promise<boolean>} - True if the passwords match, false otherwise.
 */
/*UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);*/
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        // The 'match' property has been completely removed for debugging.
    },
    password: {
        type: String,
        required: false, // Not required for Google OAuth users
        minlength: 8,
        // Validate password only if authMethod is password or not set
        validate: {
            validator: function(value) {
                // If authMethod is google, password is not required
                if (this.authMethod === 'google') {
                    return true;
                }
                // Otherwise, password is required and must meet strength requirements
                if (!value) {
                    return false;
                }
                // Minimum 8 characters
                if (value.length < 8) {
                    return false;
                }
                // At least one letter and one number (basic complexity)
                const hasLetter = /[a-zA-Z]/.test(value);
                const hasNumber = /[0-9]/.test(value);
                return hasLetter && hasNumber;
            },
            message: 'Password must be at least 8 characters long and contain both letters and numbers'
        }
    },
    domainType: {
        type: String,
        enum: ['organization', 'educational', 'personal', 'other', null],
        default: null,
    },
    authMethod: {
        type: String,
        enum: ['password', 'google', 'sso', null],
        default: 'password',
    },
    role: {
        type: String,
        enum: ['student', 'parent', 'tutor', 'admin', 'super_admin', 'school_admin'],
        default: 'student',
    },
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        default: null,
    },
    // For super_admin: allow them to function as a tutor
    availableAsTutor: {
        type: Boolean,
        default: false,
    },
    avatar: {
        type: String,
    },
    children: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    // Payment permissions for linked students (parent only)
    // Maps student ID to payment permission settings
    studentPaymentSettings: {
        type: Map,
        of: {
            canMakePayments: {
                type: Boolean,
                default: true, // Default: students can make payments
            },
        },
        default: {},
    },
    tutorInfo: {
        subjects: [{ type: String }],
        bio: { type: String },
        status: {
            type: String,
            enum: ['pending', 'active', 'inactive'],
            default: 'pending', // New tutors start as pending until approved
        },
        hourlyRate: {
            type: Number,
            default: null, // Hourly rate in dollars
        },
        monthlySalary: {
            type: Number,
            default: null, // Monthly salary in dollars (alternative to hourly)
        },
        hireDate: {
            type: Date,
            default: null, // Set when approved
        },
        // Payroll fields
        payTier: {
            type: String,
            enum: ['Tier_1', 'Tier_2', 'Tier_3', null],
            default: null, // Tier_1: $18, Tier_2: $25, Tier_3: $35
        },
        contractorType: {
            type: String,
            enum: ['US', 'International', null],
            default: null,
        },
        taxFormStatus: {
            type: String,
            enum: ['Pending', 'W9_Complete', 'W8BEN_Complete', null],
            default: 'Pending',
        },
        // Tutor availability/working hours (overrides system default if set)
        availability: {
            weeklySchedule: [{
                day: {
                    type: String,
                    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                },
                available: {
                    type: Boolean,
                    default: true,
                },
                startTime: {
                    type: String, // Format: "HH:MM" (24-hour format, e.g., "09:00")
                },
                endTime: {
                    type: String, // Format: "HH:MM" (24-hour format, e.g., "20:00")
                },
            }],
            timezone: {
                type: String,
                default: "America/New_York",
            },
            // If true, tutor has set custom availability (use availability field)
            // If false or null, use system default from SystemConfig
            hasCustomAvailability: {
                type: Boolean,
                default: false,
            },
        },
    },
    /**
     * Affiliation with an educational institution (required for learn-to-earn scholarship).
     * Public or private high school, college/university, or technical/trade school.
     */
    studentInstitution: {
        name: { type: String, default: '', trim: true, maxlength: 240 },
        type: {
            type: String,
            enum: ['high_school', 'college', 'technical_trade', null],
            default: null,
        },
        sector: {
            type: String,
            enum: ['public', 'private', null],
            default: null,
        },
    },
    /** Used for scholarship payout eligibility (age ≤ 17 requires verified parental consent) */
    dateOfBirth: {
        type: Date,
        default: null,
    },
    /** Parent/guardian + admin verification for learn-to-earn payouts (minors) */
    scholarshipPayout: {
        parentGuardianName: { type: String, default: '' },
        parentGuardianEmail: { type: String, default: '' },
        parentConsentVerified: { type: Boolean, default: false },
        parentConsentVerifiedAt: { type: Date, default: null },
        parentConsentVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    // Gamification fields
    xp: {
        type: Number,
        default: 0,
    },
    level: {
        type: Number,
        default: 1,
    },
    challengesCompleted: {
        type: Number,
        default: 0,
    },
    membership: {
        plan: {
            type: String,
            enum: ['Summa Cum Laude', 'Magna Cum Laude', 'Cum Laude', null],
            default: null,
        },
        planId: {
            type: Schema.Types.ObjectId,
            ref: 'MembershipPlan',
            default: null,
        },
        startDate: {
            type: Date,
            default: null,
        },
        endDate: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ['active', 'cancelled', 'expired', null],
            default: null,
        },
        // For Summa Cum Laude: selected session configuration
        sessionConfiguration: {
            sessionsPerWeek: {
                type: Number,
                default: 1,
            },
            sessionDuration: {
                type: Number, // in minutes
                default: 60,
            },
            additionalOption: {
                type: String, // identifier for the additional option selected
                default: null,
            },
        },
    },
    // Student profile information (for AI personalization)
    studentProfile: {
        gradeLevel: {
            type: String,
            enum: ['Elementary', 'Middle School', 'High School', 'College', 'Graduate', null],
            default: null,
        },
        grade: {
            type: String, // e.g., "9th Grade", "10th Grade", "Freshman", "Sophomore"
            default: null,
        },
        subjectOfFocus: [{
            type: String, // Array of subjects the student is focusing on
        }],
        learningStyle: {
            type: String,
            enum: ['Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', null],
            default: null,
        },
        academicGoals: {
            type: String, // Free text field for student goals
            default: null,
        },
    },
    // Two-factor authentication
    twoFactorEnabled: {
        type: Boolean,
        default: false,
    },
    twoFactorSecret: {
        type: String,
        default: null,
    },
    // Refresh token for JWT refresh pattern
    refreshToken: {
        type: String,
        default: null,
    },
    refreshTokenExpiry: {
        type: Date,
        default: null,
    },
    // Notification preferences
    notifications: {
        email: {
            type: Boolean,
            default: true,
        },
        sms: {
            type: Boolean,
            default: false,
        },
        push: {
            type: Boolean,
            default: true,
        },
    },
    // Certification badges (for tutors, admins, super_admins)
    certificationBadges: [{
        name: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        issuedBy: {
            type: String,
            default: '',
        },
        issueDate: {
            type: Date,
            default: null,
        },
        expiryDate: {
            type: Date,
            default: null,
        },
        credentialId: {
            type: String,
            default: '',
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    // Learning style profile for matching system
    learningStyleProfile: {
        dimensions: {
            visual_verbal: {
                type: Number,
                min: 0,
                max: 10,
                default: 5, // 0 = highly visual, 10 = highly verbal
            },
            sequential_global: {
                type: Number,
                min: 0,
                max: 10,
                default: 5, // 0 = very sequential, 10 = very global
            },
            active_reflective: {
                type: Number,
                min: 0,
                max: 10,
                default: 5, // 0 = very active, 10 = very reflective
            },
            structured_flexible: {
                type: Number,
                min: 0,
                max: 10,
                default: 5, // 0 = highly structured, 10 = highly flexible
            },
        },
        teachingStrengths: [{
            type: String, // Array of teaching strengths (for tutors)
        }],
        learningNeeds: [{
            type: String, // Array of learning needs (for students)
        }],
        subjectExpertise: {
            type: Map,
            of: Number, // Maps subject names to proficiency levels (0-10)
            default: {},
        },
        assessmentCompleted: {
            type: Boolean,
            default: false,
        },
        lastAssessmentDate: {
            type: Date,
            default: null,
        },
    },
}, {
    timestamps: true,
});

// Add indexes for frequently queried fields
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ 'tutorInfo.status': 1 });
UserSchema.index({ 'learningStyleProfile.assessmentCompleted': 1 });

module.exports = mongoose.model('User', UserSchema);
