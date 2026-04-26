const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Alphabet for school registration codes.
 * Excludes visually ambiguous characters (0/O, 1/I/L) to make codes easier
 * to type for students at school onboarding.
 */
const REGISTRATION_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REGISTRATION_CODE_LENGTH = 6;
const REGISTRATION_CODE_MAX_ATTEMPTS = 10;

const SchoolSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Please provide a school name'],
        trim: true,
    },
    district: {
        type: String,
        trim: true,
        default: '',
    },
    primaryContactName: {
        type: String,
        trim: true,
        default: '',
    },
    primaryContactEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
    },
    status: {
        type: String,
        enum: ['pending', 'active_pilot', 'completed', 'inactive'],
        default: 'pending',
    },
    pilotStartDate: {
        type: Date,
        default: null,
    },
    pilotEndDate: {
        type: Date,
        default: null,
    },
    registrationCode: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true,
    },
}, {
    timestamps: true,
});

/**
 * Generate a unique 6-character alphanumeric registration code.
 * Retries on collision (the registrationCode field has a unique index).
 * @returns {Promise<string>}
 */
SchoolSchema.statics.generateRegistrationCode = async function generateRegistrationCode() {
    for (let attempt = 0; attempt < REGISTRATION_CODE_MAX_ATTEMPTS; attempt += 1) {
        let code = '';
        for (let i = 0; i < REGISTRATION_CODE_LENGTH; i += 1) {
            const idx = Math.floor(Math.random() * REGISTRATION_CODE_ALPHABET.length);
            code += REGISTRATION_CODE_ALPHABET[idx];
        }

        const existing = await this.findOne({ registrationCode: code }).select('_id');
        if (!existing) {
            return code;
        }
    }
    throw new Error('Failed to generate a unique registration code after several attempts');
};

SchoolSchema.pre('validate', async function ensureRegistrationCode(next) {
    if (this.registrationCode) {
        return next();
    }
    try {
        this.registrationCode = await this.constructor.generateRegistrationCode();
        next();
    } catch (err) {
        next(err);
    }
});

module.exports = mongoose.model('School', SchoolSchema);
