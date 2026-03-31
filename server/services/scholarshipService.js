const mongoose = require('mongoose');
const ScholarshipConfig = require('../models/ScholarshipConfig');
const ScholarshipWallet = require('../models/ScholarshipWallet');
const ScholarshipLedgerEntry = require('../models/ScholarshipLedgerEntry');
const ScholarshipPayoutRequest = require('../models/ScholarshipPayoutRequest');
const User = require('../models/User');
const logger = require('../utils/logger');

const DEFAULT_TIERS = [
    { minXp: 5000, multiplierBps: 15000 },
    { minXp: 2000, multiplierBps: 12500 },
    { minXp: 0, multiplierBps: 10000 },
];

const DEFAULT_PAYOUTS = [10000, 25000, 50000, 100000, 250000, 500000];

function sortTiersDesc(tiers) {
    return [...(tiers || [])].sort((a, b) => b.minXp - a.minXp);
}

function tierMultiplierBps(userXp, tiers) {
    const sorted = sortTiersDesc(tiers);
    for (const t of sorted) {
        if (userXp >= t.minXp) return t.multiplierBps;
    }
    return 10000;
}

function applyBpsToCents(baseCents, multiplierBps) {
    return Math.floor((baseCents * multiplierBps) / 10000);
}

/**
 * Age in full years at `asOf` (default today, UTC calendar).
 * @returns {number|null} null if no DOB
 */
function ageYearsFromDob(dateOfBirth, asOf = new Date()) {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) return null;
    let age = asOf.getFullYear() - birth.getFullYear();
    const m = asOf.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) age -= 1;
    return age;
}

/** Learners 17 and under need verified parental consent to request payouts */
function requiresParentalConsentForPayout(ageYears) {
    return ageYears !== null && ageYears <= 17;
}

const INSTITUTION_TYPES = new Set(['high_school', 'college', 'technical_trade']);
const INSTITUTION_SECTORS = new Set(['public', 'private']);

/**
 * Learn-to-earn is limited to students who declare affiliation with a qualifying institution.
 */
function isStudentLearnToEarnEligible(userDoc) {
    if (!userDoc || userDoc.role !== 'student') return false;
    const si = userDoc.studentInstitution;
    if (!si) return false;
    const name = (si.name && String(si.name).trim()) || '';
    if (!name) return false;
    if (!si.type || !INSTITUTION_TYPES.has(si.type)) return false;
    if (!si.sector || !INSTITUTION_SECTORS.has(si.sector)) return false;
    return true;
}

async function ensureDefaultConfig() {
    const count = await ScholarshipConfig.countDocuments({ isActive: true });
    if (count > 0) return;
    await ScholarshipConfig.create({
        name: 'default',
        isActive: true,
        xpRequiredForOneCent: 10,
        tutoringSessionCreditCents: 500,
        tierThresholds: DEFAULT_TIERS,
        payoutAmountsCents: DEFAULT_PAYOUTS,
        maxCreditsPerDayCents: null,
    });
    logger.info('[scholarship] Seeded default ScholarshipConfig');
}

async function getActiveConfig() {
    await ensureDefaultConfig();
    let cfg = await ScholarshipConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });
    if (!cfg) {
        cfg = await ScholarshipConfig.findOne().sort({ updatedAt: -1 });
    }
    return cfg;
}

async function getOrCreateWallet(userId) {
    let w = await ScholarshipWallet.findOne({ user: userId });
    if (w) return w;
    try {
        w = await ScholarshipWallet.create({ user: userId, balanceCents: 0 });
    } catch (e) {
        if (e.code === 11000) {
            w = await ScholarshipWallet.findOne({ user: userId });
        } else throw e;
    }
    return w;
}

async function sumCreditsTodayCents(userId) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const rows = await ScholarshipLedgerEntry.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                type: 'credit',
                source: { $in: ['challenge_xp', 'tutoring_session'] },
                createdAt: { $gte: start },
            },
        },
        { $group: { _id: null, total: { $sum: '$amountCents' } } },
    ]);
    return rows[0]?.total || 0;
}

/**
 * Apply a scholarship credit (idempotent). Skips non-students and zero amounts.
 */
async function applyCredit({
    userId,
    idempotencyKey,
    source,
    title,
    baseCentsBeforeTier,
    userXpForTier,
    metadata = {},
}) {
    if (!userId || !idempotencyKey || !source) {
        return { skipped: true, reason: 'missing_args' };
    }
    const base = Math.max(0, Math.floor(baseCentsBeforeTier || 0));
    if (base === 0) {
        return { skipped: true, reason: 'zero_amount' };
    }

    const user = await User.findById(userId).select('role xp studentInstitution');
    if (!user || user.role !== 'student') {
        return { skipped: true, reason: 'not_student' };
    }
    if (!isStudentLearnToEarnEligible(user)) {
        return { skipped: true, reason: 'institution_required' };
    }

    const existing = await ScholarshipLedgerEntry.findOne({ idempotencyKey });
    if (existing) {
        return { duplicate: true, transaction: existing };
    }

    const config = await getActiveConfig();
    if (!config) {
        return { skipped: true, reason: 'no_config' };
    }

    const bps = tierMultiplierBps(userXpForTier ?? user.xp, config.tierThresholds);
    let creditCents = applyBpsToCents(base, bps);

    if (config.maxCreditsPerDayCents != null && config.maxCreditsPerDayCents > 0) {
        const soFar = await sumCreditsTodayCents(userId);
        const room = config.maxCreditsPerDayCents - soFar;
        if (room <= 0) {
            return { skipped: true, reason: 'daily_cap' };
        }
        creditCents = Math.min(creditCents, room);
    }

    if (creditCents <= 0) {
        return { skipped: true, reason: 'zero_after_cap' };
    }

    const session = await mongoose.startSession();
    let usedTransaction = false;
    try {
        session.startTransaction();
        usedTransaction = true;

        const dupInTx = await ScholarshipLedgerEntry.findOne({ idempotencyKey }).session(session);
        if (dupInTx) {
            await session.abortTransaction();
            session.endSession();
            return { duplicate: true, transaction: dupInTx };
        }

        const wallet = await ScholarshipWallet.findOneAndUpdate(
            { user: userId },
            {
                $inc: { balanceCents: creditCents, lifetimeEarnedCents: creditCents },
            },
            { new: true, upsert: true, session, setDefaultsOnInsert: true }
        );

        const entry = await ScholarshipLedgerEntry.create(
            [
                {
                    wallet: wallet._id,
                    user: userId,
                    type: 'credit',
                    amountCents: creditCents,
                    balanceAfterCents: wallet.balanceCents,
                    source,
                    idempotencyKey,
                    title: title || '',
                    metadata: { ...metadata, tierMultiplierBps: bps, baseCentsBeforeTier: base },
                },
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();
        return { wallet, transaction: entry[0] };
    } catch (err) {
        if (usedTransaction) {
            try {
                await session.abortTransaction();
            } catch (_) {
                /* ignore */
            }
        }
        session.endSession();

        const msg = String(err.message || err);
        const isTxnUnsupported =
            msg.includes('replica set') ||
            msg.includes('ReplicaSet') ||
            msg.includes('Transaction numbers') ||
            msg.includes('multi-document transactions');

        if (err.code === 11000) {
            const again = await ScholarshipLedgerEntry.findOne({ idempotencyKey });
            if (again) return { duplicate: true, transaction: again };
        }

        if (!isTxnUnsupported) {
            logger.error('[scholarship] applyCredit failed', { error: msg, idempotencyKey });
            throw err;
        }

        logger.warn('[scholarship] Falling back to non-transactional applyCredit (dev/single-node Mongo?)');

        const dup2 = await ScholarshipLedgerEntry.findOne({ idempotencyKey });
        if (dup2) return { duplicate: true, transaction: dup2 };

        const wallet = await ScholarshipWallet.findOneAndUpdate(
            { user: userId },
            { $inc: { balanceCents: creditCents, lifetimeEarnedCents: creditCents } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        try {
            const entry = await ScholarshipLedgerEntry.create({
                wallet: wallet._id,
                user: userId,
                type: 'credit',
                amountCents: creditCents,
                balanceAfterCents: wallet.balanceCents,
                source,
                idempotencyKey,
                title: title || '',
                metadata: { ...metadata, tierMultiplierBps: bps, baseCentsBeforeTier: base },
            });
            return { wallet, transaction: entry };
        } catch (e2) {
            if (e2.code === 11000) {
                const again = await ScholarshipLedgerEntry.findOne({ idempotencyKey });
                if (again) return { duplicate: true, transaction: again };
            }
            await ScholarshipWallet.findOneAndUpdate(
                { user: userId },
                { $inc: { balanceCents: -creditCents, lifetimeEarnedCents: -creditCents } }
            );
            throw e2;
        }
    }
}

async function creditChallengeXp(userId, attemptId, xpReward, userXpAfterAward) {
    const config = await getActiveConfig();
    if (!config) return { skipped: true };
    const base = Math.floor(xpReward / config.xpRequiredForOneCent);
    return applyCredit({
        userId,
        idempotencyKey: `challenge_attempt:${attemptId}`,
        source: 'challenge_xp',
        title: 'Challenge XP reward',
        baseCentsBeforeTier: base,
        userXpForTier: userXpAfterAward,
        metadata: { xpReward },
    });
}

async function creditTutoringSession(studentId, bookingId) {
    const config = await getActiveConfig();
    if (!config) return { skipped: true };
    const user = await User.findById(studentId).select('role xp studentInstitution');
    if (!user || user.role !== 'student') return { skipped: true, reason: 'not_student' };
    if (!isStudentLearnToEarnEligible(user)) return { skipped: true, reason: 'institution_required' };
    return applyCredit({
        userId: studentId,
        idempotencyKey: `tutoring_session:${bookingId}`,
        source: 'tutoring_session',
        title: 'Tutoring session completed',
        baseCentsBeforeTier: config.tutoringSessionCreditCents,
        userXpForTier: user.xp,
        metadata: { bookingId: String(bookingId) },
    });
}

async function createPayoutRequest(userId, amountCents, parentConsentAttested) {
    const user = await User.findById(userId);
    if (!user || user.role !== 'student') {
        const err = new Error('Only students can request scholarship payouts');
        err.statusCode = 403;
        throw err;
    }
    if (!isStudentLearnToEarnEligible(user)) {
        const err = new Error(
            'Learn-to-earn payouts are only available for students affiliated with a high school, college, or technical/trade school. Complete your school details in Settings.'
        );
        err.statusCode = 403;
        throw err;
    }

    const config = await getActiveConfig();
    if (!config) {
        const err = new Error('Scholarship is not configured');
        err.statusCode = 503;
        throw err;
    }

    const allowed = new Set(config.payoutAmountsCents || DEFAULT_PAYOUTS);
    if (!allowed.has(amountCents)) {
        const err = new Error('Invalid payout amount');
        err.statusCode = 400;
        throw err;
    }

    if (!user.dateOfBirth) {
        const err = new Error('Add your date of birth in profile before requesting a payout');
        err.statusCode = 400;
        throw err;
    }

    const age = ageYearsFromDob(user.dateOfBirth);
    if (requiresParentalConsentForPayout(age)) {
        if (!parentConsentAttested) {
            const err = new Error('Parent/guardian consent must be confirmed for students age 17 and under');
            err.statusCode = 400;
            throw err;
        }
        if (!user.scholarshipPayout?.parentConsentVerified) {
            const err = new Error(
                'Parental consent must be verified by Start Right before you can receive funds. Complete parent/guardian details in your profile; our team will verify.'
            );
            err.statusCode = 403;
            throw err;
        }
    }

    const wallet = await getOrCreateWallet(userId);
    if (wallet.balanceCents < amountCents) {
        const err = new Error('Insufficient scholarship balance');
        err.statusCode = 400;
        throw err;
    }

    const idempotencyKey = `payout_req:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const w = await ScholarshipWallet.findOneAndUpdate(
            { user: userId, balanceCents: { $gte: amountCents } },
            { $inc: { balanceCents: -amountCents, lifetimePaidOutCents: amountCents } },
            { new: true, session }
        );

        if (!w) {
            await session.abortTransaction();
            session.endSession();
            const err = new Error('Insufficient scholarship balance');
            err.statusCode = 400;
            throw err;
        }

        const reqDoc = await ScholarshipPayoutRequest.create(
            [
                {
                    user: userId,
                    amountCents,
                    status: 'pending',
                    parentConsentAttested: !!parentConsentAttested,
                    ledgerDebitKey: idempotencyKey,
                },
            ],
            { session }
        );

        await ScholarshipLedgerEntry.create(
            [
                {
                    wallet: w._id,
                    user: userId,
                    type: 'debit',
                    amountCents,
                    balanceAfterCents: w.balanceCents,
                    source: 'payout_request',
                    idempotencyKey,
                    title: 'Payout request (pending)',
                    metadata: { payoutRequestId: String(reqDoc[0]._id) },
                },
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();
        return reqDoc[0];
    } catch (err) {
        try {
            await session.abortTransaction();
        } catch (_) {
            /* ignore */
        }
        session.endSession();

        const msg = String(err.message || err);
        const isTxnUnsupported =
            msg.includes('replica set') ||
            msg.includes('ReplicaSet') ||
            msg.includes('Transaction numbers') ||
            msg.includes('multi-document transactions');

        if (!isTxnUnsupported && err.statusCode) throw err;
        if (!isTxnUnsupported && !err.statusCode) {
            logger.error('[scholarship] createPayoutRequest txn failed', { error: msg });
            throw err;
        }

        const w2 = await ScholarshipWallet.findOneAndUpdate(
            { user: userId, balanceCents: { $gte: amountCents } },
            { $inc: { balanceCents: -amountCents, lifetimePaidOutCents: amountCents } },
            { new: true }
        );
        if (!w2) {
            const e2 = new Error('Insufficient scholarship balance');
            e2.statusCode = 400;
            throw e2;
        }

        const reqDoc = await ScholarshipPayoutRequest.create({
            user: userId,
            amountCents,
            status: 'pending',
            parentConsentAttested: !!parentConsentAttested,
            ledgerDebitKey: idempotencyKey,
        });

        await ScholarshipLedgerEntry.create({
            wallet: w2._id,
            user: userId,
            type: 'debit',
            amountCents,
            balanceAfterCents: w2.balanceCents,
            source: 'payout_request',
            idempotencyKey,
            title: 'Payout request (pending)',
            metadata: { payoutRequestId: String(reqDoc._id) },
        });

        return reqDoc;
    }
}

async function rejectPayoutRequest(requestId, adminUserId, adminNotes) {
    const pr = await ScholarshipPayoutRequest.findById(requestId);
    if (!pr || pr.status !== 'pending') {
        const err = new Error('Payout request not found or not pending');
        err.statusCode = 400;
        throw err;
    }

    const reversalKey = `payout_reversal:${pr._id}`;
    const existing = await ScholarshipLedgerEntry.findOne({ idempotencyKey: reversalKey });
    if (existing) {
        pr.status = 'rejected';
        pr.reviewedBy = adminUserId;
        pr.reviewedAt = new Date();
        pr.adminNotes = adminNotes || '';
        await pr.save();
        return pr;
    }

    const wallet = await getOrCreateWallet(pr.user);
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const w = await ScholarshipWallet.findOneAndUpdate(
            { user: pr.user },
            { $inc: { balanceCents: pr.amountCents, lifetimePaidOutCents: -pr.amountCents } },
            { new: true, session }
        );
        await ScholarshipLedgerEntry.create(
            [
                {
                    wallet: w._id,
                    user: pr.user,
                    type: 'credit',
                    amountCents: pr.amountCents,
                    balanceAfterCents: w.balanceCents,
                    source: 'payout_reversal',
                    idempotencyKey: reversalKey,
                    title: 'Payout rejected — balance restored',
                    metadata: { payoutRequestId: String(pr._id) },
                },
            ],
            { session }
        );
        pr.status = 'rejected';
        pr.reviewedBy = adminUserId;
        pr.reviewedAt = new Date();
        pr.adminNotes = adminNotes || '';
        await pr.save({ session });
        await session.commitTransaction();
        session.endSession();
        return pr;
    } catch (err) {
        try {
            await session.abortTransaction();
        } catch (_) {
            /* ignore */
        }
        session.endSession();

        const msg = String(err.message || err);
        const isTxnUnsupported =
            msg.includes('replica set') ||
            msg.includes('ReplicaSet') ||
            msg.includes('Transaction numbers') ||
            msg.includes('multi-document transactions');

        if (!isTxnUnsupported) throw err;

        const w = await ScholarshipWallet.findOneAndUpdate(
            { user: pr.user },
            { $inc: { balanceCents: pr.amountCents, lifetimePaidOutCents: -pr.amountCents } },
            { new: true }
        );
        await ScholarshipLedgerEntry.create({
            wallet: w._id,
            user: pr.user,
            type: 'credit',
            amountCents: pr.amountCents,
            balanceAfterCents: w.balanceCents,
            source: 'payout_reversal',
            idempotencyKey: reversalKey,
            title: 'Payout rejected — balance restored',
            metadata: { payoutRequestId: String(pr._id) },
        });
        pr.status = 'rejected';
        pr.reviewedBy = adminUserId;
        pr.reviewedAt = new Date();
        pr.adminNotes = adminNotes || '';
        await pr.save();
        return pr;
    }
}

module.exports = {
    getActiveConfig,
    ensureDefaultConfig,
    getOrCreateWallet,
    applyCredit,
    creditChallengeXp,
    creditTutoringSession,
    createPayoutRequest,
    rejectPayoutRequest,
    ageYearsFromDob,
    requiresParentalConsentForPayout,
    isStudentLearnToEarnEligible,
    tierMultiplierBps,
    DEFAULT_PAYOUTS,
};
