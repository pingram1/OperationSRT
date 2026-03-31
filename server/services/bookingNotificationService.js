const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Expire pending session requests that have passed their session date.
 * Updates tutorAcceptanceStatus to 'request_expired' and creates notifications.
 */
const expirePendingRequests = async () => {
    try {
        const now = new Date();
        const expired = await Booking.find({
            status: 'scheduled',
            tutorAcceptanceStatus: 'pending',
            tutor: { $exists: true, $ne: null },
            sessionDate: { $lt: now },
        }).populate('tutor', 'name').populate('student', 'name');

        if (expired.length === 0) return { expired: 0, notified: 0 };

        const admins = await User.find({ role: 'admin' }).select('_id');
        const superAdmins = await User.find({ role: 'super_admin' }).select('_id');
        const adminIds = admins.map(a => a._id.toString());
        const superAdminIds = superAdmins.map(s => s._id.toString());

        const notificationsToCreate = [];
        for (const booking of expired) {
            booking.tutorAcceptanceStatus = 'request_expired';
            await booking.save();

            const sessionDateStr = new Date(booking.sessionDate).toLocaleString();
            const message = `Session request expired: ${booking.student?.name || 'Student'} – ${booking.subject} (${sessionDateStr}). Please offer a reschedule.`;

            const recipients = new Set([...adminIds, ...superAdminIds]);
            if (booking.tutor?._id) recipients.add(booking.tutor._id.toString());

            for (const rid of recipients) {
                notificationsToCreate.push({
                    recipient: rid,
                    type: 'request_expired',
                    message,
                    booking: booking._id,
                    actionUrl: '/admin-bookings',
                });
            }
        }

        if (notificationsToCreate.length > 0) {
            await Notification.insertMany(notificationsToCreate);
        }

        logger.info(`[expirePendingRequests] Expired ${expired.length} requests, created ${notificationsToCreate.length} notifications`);
        return { expired: expired.length, notified: notificationsToCreate.length };
    } catch (error) {
        logger.error('[expirePendingRequests] Error:', error);
        throw error;
    }
};

/**
 * Create no-show notifications for tutor, all admins, all super_admins.
 */
const createNoShowNotifications = async (booking) => {
    try {
        const populated = await Booking.findById(booking._id)
            .populate('tutor', 'name')
            .populate('student', 'name');

        const recipientIds = new Set();
        if (populated.tutor?._id) recipientIds.add(populated.tutor._id.toString());

        const admins = await User.find({ role: 'admin' }).select('_id');
        const superAdmins = await User.find({ role: 'super_admin' }).select('_id');
        admins.forEach(a => recipientIds.add(a._id.toString()));
        superAdmins.forEach(s => recipientIds.add(s._id.toString()));

        const sessionDateStr = new Date(populated.sessionDate).toLocaleString();
        const message = `No-show: ${populated.student?.name || 'Student'} and ${populated.tutor?.name || 'Tutor'} – ${populated.subject} (${sessionDateStr}).`;

        const notifications = [...recipientIds].map(rid => ({
            recipient: rid,
            type: 'no_show',
            message,
            booking: populated._id,
            actionUrl: '/admin-bookings',
        }));

        await Notification.insertMany(notifications);
        logger.info(`[createNoShowNotifications] Created ${notifications.length} notifications for booking ${booking._id}`);
    } catch (error) {
        logger.error('[createNoShowNotifications] Error:', error);
        throw error;
    }
};

/**
 * Notify tutor (and optionally admins/super_admins) when a session is proposed.
 */
const createSessionRequestedNotification = async (booking) => {
    try {
        const populated = await Booking.findById(booking._id)
            .populate('tutor', 'name')
            .populate('student', 'name');

        if (!populated.tutor?._id) return;

        const sessionDateStr = new Date(populated.sessionDate).toLocaleString();
        const message = `New session request: ${populated.student?.name || 'Student'} – ${populated.subject} (${sessionDateStr}). Please accept or decline.`;

        const notifications = [{ recipient: populated.tutor._id, type: 'session_requested', message, booking: populated._id, actionUrl: '/tutor-appointments' }];

        const admins = await User.find({ role: 'admin' }).select('_id');
        const superAdmins = await User.find({ role: 'super_admin' }).select('_id');
        for (const a of admins) notifications.push({ recipient: a._id, type: 'session_requested', message, booking: populated._id, actionUrl: '/admin-bookings' });
        for (const s of superAdmins) notifications.push({ recipient: s._id, type: 'session_requested', message, booking: populated._id, actionUrl: '/admin-bookings' });

        await Notification.insertMany(notifications);
        logger.info(`[createSessionRequestedNotification] Created ${notifications.length} notifications for booking ${booking._id}`);
    } catch (error) {
        logger.error('[createSessionRequestedNotification] Error:', error);
    }
};

module.exports = {
    expirePendingRequests,
    createNoShowNotifications,
    createSessionRequestedNotification,
};
