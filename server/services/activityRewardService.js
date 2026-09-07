const ActivityProgress = require('../models/ActivityProgress');
const {
    REPLAY_COOLDOWN_MS,
    partialXpFor,
} = require('../constants/activityRewards');

/**
 * Time-throttled XP evaluation engine.
 *
 * Replayability payout rules:
 *   1. First time ever        -> 100% base XP. Sets firstCompletedAt.
 *   2. Replay, cooldown over  -> 10% base XP. Updates lastPartialXpClaimedAt.
 *   3. Replay, in cooldown    -> 0 XP. Practice-only.
 *
 * Cooldown reference timestamp = lastPartialXpClaimedAt ?? firstCompletedAt.
 * Every state transition is a guarded atomic update so concurrent submits
 * cannot double-pay.
 *
 * @param {object} args
 * @param {string|ObjectId} args.userId
 * @param {string|ObjectId} args.activityId
 * @param {number} args.baseXp
 * @param {'challenge'|'visualizer'} [args.activityType='challenge']
 * @param {Date} [args.now]
 * @returns {Promise<{
 *   xpAwarded: number,
 *   payoutType: 'first_completion'|'weekly_partial'|'practice_only',
 *   isPracticeOnly: boolean,
 *   isFirstCompletion: boolean,
 *   nextPartialAvailableAt: Date,
 *   progress: object
 * }>}
 */
async function evaluateActivityAttempt({
    userId,
    activityId,
    baseXp,
    activityType = 'challenge',
    now = new Date(),
}) {
    const normalizedBase = Math.max(0, Math.floor(Number(baseXp) || 0));
    const key = { user: userId, activityType, activity: activityId };

    let progress = await ActivityProgress.findOne(key);

    // ---- CASE 1: First completion ever ----
    if (!progress || progress.firstCompletedAt == null) {
        try {
            const created = await ActivityProgress.findOneAndUpdate(
                { ...key, firstCompletedAt: null },
                {
                    $setOnInsert: { ...key },
                    $set: { firstCompletedAt: now, lastCompletedAt: now },
                    $inc: { completedCount: 1, totalXpEarned: normalizedBase },
                },
                { new: true, upsert: true, setDefaultsOnInsert: true },
            );

            return {
                xpAwarded: normalizedBase,
                payoutType: 'first_completion',
                isPracticeOnly: false,
                isFirstCompletion: true,
                nextPartialAvailableAt: new Date(now.getTime() + REPLAY_COOLDOWN_MS),
                progress: created,
            };
        } catch (err) {
            // Another concurrent request won the first-completion race.
            if (err.code !== 11000) throw err;
            progress = await ActivityProgress.findOne(key);
        }
    }

    if (!progress) {
        progress = await ActivityProgress.findOne(key);
    }

    // ---- CASE 2: Replay, weekly partial available ----
    const ref = progress.lastPartialXpClaimedAt ?? progress.firstCompletedAt;
    const elapsed = now.getTime() - new Date(ref).getTime();

    if (elapsed >= REPLAY_COOLDOWN_MS) {
        const partialXp = partialXpFor(normalizedBase);
        const claimed = await ActivityProgress.findOneAndUpdate(
            // Guard on the exact timestamp we read so a racing claim can't double-pay.
            { _id: progress._id, lastPartialXpClaimedAt: progress.lastPartialXpClaimedAt },
            {
                $set: { lastPartialXpClaimedAt: now, lastCompletedAt: now },
                $inc: { completedCount: 1, totalXpEarned: partialXp },
            },
            { new: true },
        );

        if (claimed) {
            return {
                xpAwarded: partialXp,
                payoutType: 'weekly_partial',
                isPracticeOnly: false,
                isFirstCompletion: false,
                nextPartialAvailableAt: new Date(now.getTime() + REPLAY_COOLDOWN_MS),
                progress: claimed,
            };
        }

        // Lost the race; re-read and fall through to practice.
        progress = await ActivityProgress.findOne(key);
    }

    // ---- CASE 3: Replay inside cooldown -> practice only ----
    const refNow = progress.lastPartialXpClaimedAt ?? progress.firstCompletedAt;
    const nextPartialAvailableAt = new Date(new Date(refNow).getTime() + REPLAY_COOLDOWN_MS);

    const practiced = await ActivityProgress.findOneAndUpdate(
        { _id: progress._id },
        { $set: { lastCompletedAt: now }, $inc: { completedCount: 1 } },
        { new: true },
    );

    return {
        xpAwarded: 0,
        payoutType: 'practice_only',
        isPracticeOnly: true,
        isFirstCompletion: false,
        nextPartialAvailableAt,
        progress: practiced || progress,
    };
}

/**
 * Read-only preview of what the NEXT completion would pay, without mutating
 * the ledger. Used to render reward badges on activity cards.
 *
 * @param {object|null} progress - ActivityProgress doc (or null if none yet)
 * @param {number} baseXp
 * @param {Date} [now]
 * @returns {{
 *   state: 'available'|'practice',
 *   payoutType: 'first_completion'|'weekly_partial'|'practice_only',
 *   xpAvailable: number,
 *   baseXp: number,
 *   nextPartialAvailableAt: Date|null
 * }}
 */
function previewActivityReward(progress, baseXp, now = new Date()) {
    const normalizedBase = Math.max(0, Math.floor(Number(baseXp) || 0));

    if (!progress || progress.firstCompletedAt == null) {
        return {
            state: 'available',
            payoutType: 'first_completion',
            xpAvailable: normalizedBase,
            baseXp: normalizedBase,
            nextPartialAvailableAt: null,
        };
    }

    const ref = progress.lastPartialXpClaimedAt ?? progress.firstCompletedAt;
    const nextPartialAvailableAt = new Date(new Date(ref).getTime() + REPLAY_COOLDOWN_MS);

    if (now.getTime() >= nextPartialAvailableAt.getTime()) {
        return {
            state: 'available',
            payoutType: 'weekly_partial',
            xpAvailable: partialXpFor(normalizedBase),
            baseXp: normalizedBase,
            nextPartialAvailableAt,
        };
    }

    return {
        state: 'practice',
        payoutType: 'practice_only',
        xpAvailable: 0,
        baseXp: normalizedBase,
        nextPartialAvailableAt,
    };
}

/**
 * Batch-fetch ledger rows for a user across many activities, keyed by
 * activity id string. Convenience for list endpoints that render badges.
 *
 * @param {string|ObjectId} userId
 * @param {'challenge'|'visualizer'} activityType
 * @param {Array<string|ObjectId>} activityIds
 * @returns {Promise<Record<string, object>>}
 */
async function getProgressMap(userId, activityType, activityIds) {
    if (!userId || !Array.isArray(activityIds) || activityIds.length === 0) {
        return {};
    }
    const rows = await ActivityProgress.find({
        user: userId,
        activityType,
        activity: { $in: activityIds },
    }).lean();

    return rows.reduce((map, row) => {
        map[row.activity.toString()] = row;
        return map;
    }, {});
}

module.exports = {
    evaluateActivityAttempt,
    previewActivityReward,
    getProgressMap,
};
