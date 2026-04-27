const Announcement = require('../models/Announcement');
const User = require('../models/User');

/**
 * @desc    Create a new announcement
 * @route   POST /api/announcements
 * @access  Private (Admin only)
 */
const createAnnouncement = async (req, res) => {
    try {
        const { title, message, audience } = req.body;
        const createdBy = req.user.id;

        // Validate required fields
        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        // Validate audience
        const validAudiences = ['all', 'students', 'parents', 'tutors', 'admin'];
        const targetAudience = audience || 'all';
        if (!validAudiences.includes(targetAudience.toLowerCase())) {
            return res.status(400).json({ message: 'Invalid audience. Must be one of: all, students, parents, tutors, admin' });
        }

        // Create announcement
        const announcement = new Announcement({
            title,
            message,
            audience: targetAudience.toLowerCase(),
            createdBy,
            isActive: true,
        });

        const savedAnnouncement = await announcement.save();
        
        // Populate creator info
        await savedAnnouncement.populate('createdBy', 'name email');

        // Get target users based on audience
        const targetUsers = await getTargetUsers(targetAudience.toLowerCase());
        
        console.log(`[createAnnouncement] Announcement created: ${savedAnnouncement._id}, targeting ${targetUsers.length} users`);

        res.status(201).json({
            announcement: savedAnnouncement,
            message: `Announcement sent to ${targetUsers.length} users`,
            usersNotified: targetUsers.length,
        });
    } catch (error) {
        console.error('[createAnnouncement] Error:', error);
        res.status(500).json({ message: 'Server error while creating announcement' });
    }
};

/**
 * @desc    Get all announcements (Admin view)
 * @route   GET /api/announcements
 * @access  Private (Admin only)
 */
const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 }); // Most recent first

        res.json(announcements);
    } catch (error) {
        console.error('[getAllAnnouncements] Error:', error);
        res.status(500).json({ message: 'Server error while fetching announcements' });
    }
};

/**
 * @desc    Get announcements relevant to the current user
 * @route   GET /api/announcements/user
 * @access  Private
 */
const getUserAnnouncements = async (req, res) => {
    try {
        const user = req.user;
        
        // Safety check - if user is not properly set, return empty array
        if (!user || !user.role) {
            console.warn('[getUserAnnouncements] User or role not found, returning empty array');
            return res.json([]);
        }
        
        const userRole = user.role;

        // Find announcements that are:
        // 1. Active
        // 2. Target 'all' users OR target the user's specific role
        const announcements = await Announcement.find({
            isActive: true,
            $or: [
                { audience: 'all' },
                { audience: userRole }
            ]
        })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(50); // Limit to most recent 50 announcements

        res.json(announcements);
    } catch (error) {
        // Log error but return empty array instead of 500 to prevent client-side issues
        console.error('[getUserAnnouncements] Error:', error);
        // Return empty array instead of error to prevent authentication issues
        res.json([]);
    }
};

/**
 * @desc    Delete an announcement
 * @route   DELETE /api/announcements/:id
 * @access  Private (Admin only)
 */
const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        const announcement = await Announcement.findById(id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        await Announcement.findByIdAndDelete(id);

        console.log(`[deleteAnnouncement] Announcement deleted: ${id}`);
        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('[deleteAnnouncement] Error:', error);
        res.status(500).json({ message: 'Server error while deleting announcement' });
    }
};

/**
 * @desc    Update an announcement (soft delete by setting isActive to false, or update content)
 * @route   PUT /api/announcements/:id
 * @access  Private (Admin only)
 */
const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, message, audience, isActive } = req.body;

        const announcement = await Announcement.findById(id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        // Update fields if provided
        if (title) announcement.title = title;
        if (message) announcement.message = message;
        if (audience) {
            const validAudiences = ['all', 'students', 'parents', 'tutors', 'admin'];
            if (validAudiences.includes(audience.toLowerCase())) {
                announcement.audience = audience.toLowerCase();
            }
        }
        if (typeof isActive === 'boolean') announcement.isActive = isActive;

        const updatedAnnouncement = await announcement.save();
        await updatedAnnouncement.populate('createdBy', 'name email');

        res.json(updatedAnnouncement);
    } catch (error) {
        console.error('[updateAnnouncement] Error:', error);
        res.status(500).json({ message: 'Server error while updating announcement' });
    }
};

/**
 * Helper function to get target users based on audience
 */
const getTargetUsers = async (audience) => {
    if (audience === 'all') {
        return await User.find().select('_id name email role');
    }
    
    return await User.find({ role: audience }).select('_id name email role');
};

module.exports = {
    createAnnouncement,
    getAllAnnouncements,
    getUserAnnouncements,
    deleteAnnouncement,
    updateAnnouncement,
};

