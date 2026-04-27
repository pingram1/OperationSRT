const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * @desc    Get notifications for the current user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { unreadOnly, limit = 50 } = req.query;

        const query = { recipient: userId };
        if (unreadOnly === 'true') query.read = false;

        const notifications = await Notification.find(query)
            .populate('booking', 'student tutor subject sessionDate status tutorAcceptanceStatus')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

        res.json({ notifications, unreadCount });
    } catch (error) {
        logger.error('[getNotifications] Error:', error);
        res.status(500).json({ message: 'Server error while fetching notifications' });
    }
};

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.user.id,
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.read = true;
        await notification.save();

        res.json({ notification });
    } catch (error) {
        logger.error('[markAsRead] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id },
            { $set: { read: true } }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        logger.error('[markAllAsRead] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
};
