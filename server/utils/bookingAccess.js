/**
 * Booking access checks shared across payment + booking controllers.
 *
 * Encapsulates the "is this user authorized to act on this booking?" rule
 * that was duplicated in three places in paymentController. Centralizing
 * here makes the rule auditable and avoids drift.
 *
 * Rule (matches prior behavior):
 *   - The booking's owning user is authorized.
 *   - The booking's student is authorized.
 *   - admin / super_admin are authorized.
 *   - A parent is authorized iff the booking's student is one of their
 *     linked children.
 */

const User = require('../models/User');

/**
 * @param {object} req            Express request (must have req.user)
 * @param {object} booking        Mongoose booking doc (populated user/student preferred)
 * @returns {Promise<boolean>}
 */
async function canUserAccessBooking(req, booking) {
    if (!req?.user || !booking) return false;
    const userId = req.user.id;
    if (!userId) return false;

    const ownerId = (booking.user?._id || booking.user)?.toString();
    const studentId = (booking.student?._id || booking.student)?.toString();

    if (ownerId === userId || studentId === userId) return true;
    if (req.user.role === 'admin' || req.user.role === 'super_admin') return true;

    if (req.user.role === 'parent') {
        // Match the prior behavior: no .select() — the controller test
        // mocks User.findById to resolve directly to a plain object.
        const parent = await User.findById(userId);
        if (parent && parent.children && parent.children.length > 0) {
            const childIds = parent.children.map((c) => (c._id || c).toString());
            if (studentId && childIds.includes(studentId)) return true;
        }
    }

    return false;
}

module.exports = { canUserAccessBooking };
