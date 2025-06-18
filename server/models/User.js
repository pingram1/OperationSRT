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
        enum: ['student', 'parent', 'tutor', 'admin'],
        default: 'student',
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
        required: [true, 'Please provide a password'],
        minlength: 6,
    },
    role: {
        type: String,
        enum: ['student', 'parent', 'tutor', 'admin'],
        default: 'student',
    },
    avatar: {
        type: String,
    },
    children: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    tutorInfo: {
        subjects: [{ type: String }],
        bio: { type: String },
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('User', UserSchema);
