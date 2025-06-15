const User = require('../models/User');

/**
 * @desc    Get the profile of the currently logged-in user
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
    try {
        // req.user.id is attached by the authMiddleware after token verification
        const user = await User.findById(req.user.id).select('-password'); // Exclude password from the result

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Update a user's profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
    const { name, email, avatar, tutorInfo } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the fields that were provided
        user.name = name || user.name;
        user.email = email || user.email;
        user.avatar = avatar || user.avatar;
        if (user.role === 'tutor') {
            user.tutorInfo = tutorInfo || user.tutorInfo;
        }

        const updatedUser = await user.save();

        res.json({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar,
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Get all users (for admin purposes)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getAllUsers,
};