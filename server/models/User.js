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
        // Using a standard, robust regex for email validation
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ],
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