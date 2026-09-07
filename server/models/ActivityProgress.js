const mongoose = require('mongoose');
const { ACTIVITY_TYPES } = require('../constants/activityRewards');

const Schema = mongoose.Schema;

/**
 * ActivityProgress - per-user, per-activity lifetime completion ledger.
 *
 * One document per (user, activityType, activity). Drives the time-throttled
 * XP engine: first completion pays full XP, subsequent completions pay a
 * weekly partial, and plays inside the cooldown window are practice-only.
 *
 * `activity` is a loose ObjectId reference resolved by `activityType`
 * (Challenge or Visualizer) rather than a refPath, to avoid coupling the
 * ledger to a single collection.
 */
const ActivityProgressSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    activityType: {
        type: String,
        enum: ACTIVITY_TYPES,
        required: true,
        default: 'challenge',
    },
    activity: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    // Total completions recorded (full + partial + practice).
    completedCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Set once, on the first-ever completion.
    firstCompletedAt: {
        type: Date,
        default: null,
    },
    // Updated each time a weekly partial XP claim is paid out.
    lastPartialXpClaimedAt: {
        type: Date,
        default: null,
    },
    // Updated on every completion, regardless of payout.
    lastCompletedAt: {
        type: Date,
        default: null,
    },
    // Running audit total of XP credited through this ledger row.
    totalXpEarned: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true,
});

// One ledger row per user per activity — also enables race-safe atomic upserts.
ActivityProgressSchema.index({ user: 1, activityType: 1, activity: 1 }, { unique: true });

module.exports = mongoose.model('ActivityProgress', ActivityProgressSchema);
