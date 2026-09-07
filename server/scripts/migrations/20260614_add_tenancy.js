/**
 * Migration: 20260614_add_tenancy
 *
 * Backfills the tenant/sector isolation fields introduced in the P0 beta
 * remediation epic (Task 1):
 *
 *   1. User.sector        ← copied from the user's School.sector
 *   2. Booking.schoolId   ← copied from the booking's student.schoolId
 *   3. Booking.sector     ← copied from the booking's student.sector (post step 1)
 *   4. twoFactorEnabled   ← reset to false where twoFactorSecret is null
 *                           (the legacy "fake 2FA" left this true with no secret;
 *                            Task 4 enforces 2FA at login, so we must not lock
 *                            those accounts out).
 *
 * The migration is IDEMPOTENT — safe to run multiple times. It only writes a
 * field when the source value exists and the target differs.
 *
 * Run:     node scripts/migrations/20260614_add_tenancy.js
 * Rollback: see scripts/migrations/README.md (fields are additive; rollback is
 *           dropping the columns or unsetting them — documented there).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../../config/db');
const User = require('../../models/User');
const School = require('../../models/School');
const Booking = require('../../models/Booking');
const logger = require('../../utils/logger');

async function backfillUserSectors() {
    const schools = await School.find({ sector: { $ne: null } }).select('_id sector').lean();
    const sectorBySchool = new Map(schools.map((s) => [String(s._id), s.sector]));

    let updated = 0;
    const usersWithSchool = await User.find({ schoolId: { $ne: null } })
        .select('_id schoolId sector')
        .lean();

    for (const u of usersWithSchool) {
        const sector = sectorBySchool.get(String(u.schoolId));
        if (sector && u.sector !== sector) {
            await User.updateOne({ _id: u._id }, { $set: { sector } });
            updated += 1;
        }
    }
    return { scanned: usersWithSchool.length, updated };
}

async function backfillBookingTenancy() {
    let updated = 0;
    const bookings = await Booking.find({
        $or: [{ schoolId: null }, { sector: null }],
    })
        .select('_id student schoolId sector')
        .lean();

    for (const b of bookings) {
        if (!b.student) continue;
        const student = await User.findById(b.student).select('schoolId sector').lean();
        if (!student) continue;

        const set = {};
        if (!b.schoolId && student.schoolId) set.schoolId = student.schoolId;
        if (!b.sector && student.sector) set.sector = student.sector;

        if (Object.keys(set).length > 0) {
            await Booking.updateOne({ _id: b._id }, { $set: set });
            updated += 1;
        }
    }
    return { scanned: bookings.length, updated };
}

async function resetOrphanedTwoFactor() {
    const result = await User.updateMany(
        { twoFactorEnabled: true, $or: [{ twoFactorSecret: null }, { twoFactorSecret: { $exists: false } }] },
        { $set: { twoFactorEnabled: false } },
    );
    return { reset: result.modifiedCount || 0 };
}

async function run() {
    await connectDB();
    try {
        logger.info('[migration:20260614_add_tenancy] starting');

        const users = await backfillUserSectors();
        logger.info('[migration] user sectors backfilled', users);

        const bookings = await backfillBookingTenancy();
        logger.info('[migration] booking tenancy backfilled', bookings);

        const twoFa = await resetOrphanedTwoFactor();
        logger.info('[migration] orphaned 2FA reset', twoFa);

        logger.info('[migration:20260614_add_tenancy] complete', { users, bookings, twoFa });
        // eslint-disable-next-line no-console
        console.log('Migration complete:', JSON.stringify({ users, bookings, twoFa }, null, 2));
        process.exit(0);
    } catch (err) {
        logger.error('[migration:20260614_add_tenancy] failed', { error: err.message });
        // eslint-disable-next-line no-console
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await mongoose.connection.close().catch(() => {});
    }
}

// Only auto-run when invoked directly (so the functions can be unit-tested).
if (require.main === module) {
    run();
}

module.exports = {
    backfillUserSectors,
    backfillBookingTenancy,
    resetOrphanedTwoFactor,
    run,
};
