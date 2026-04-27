const User = require('../models/User');
const ScholarshipWallet = require('../models/ScholarshipWallet');
const ScholarshipLedgerEntry = require('../models/ScholarshipLedgerEntry');
const ScholarshipPayoutRequest = require('../models/ScholarshipPayoutRequest');
const {
    getActiveConfig,
    getOrCreateWallet,
    createPayoutRequest,
    rejectPayoutRequest,
    ageYearsFromDob,
    requiresParentalConsentForPayout,
    isStudentLearnToEarnEligible,
} = require('../services/scholarshipService');
const logger = require('../utils/logger');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

/**
 * @route GET /api/scholarship/config
 * @access Public (amounts/tiers for UI)
 */
const getPublicConfig = async (req, res) => {
    try {
        const config = await getActiveConfig();
        if (!config) {
            return res.status(503).json({ message: 'Scholarship not configured' });
        }
        res.json({
            xpRequiredForOneCent: config.xpRequiredForOneCent,
            tutoringSessionCreditCents: config.tutoringSessionCreditCents,
            tierThresholds: config.tierThresholds,
            payoutAmountsCents: config.payoutAmountsCents,
            requiresInstitutionAffiliation: true,
        });
    } catch (err) {
        logger.error('[scholarship] getPublicConfig', { error: err.message });
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route GET /api/scholarship/wallet
 * @access Private (student)
 */
const getWallet = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            'role dateOfBirth scholarshipPayout studentInstitution'
        );
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Scholarship wallet is for students' });
        }
        const eligible = isStudentLearnToEarnEligible(user);
        let wallet;
        if (eligible) {
            wallet = await getOrCreateWallet(req.user.id);
        } else {
            wallet = await ScholarshipWallet.findOne({ user: req.user.id });
        }
        const w = wallet || {
            balanceCents: 0,
            lifetimeEarnedCents: 0,
            lifetimePaidOutCents: 0,
        };
        const age = ageYearsFromDob(user.dateOfBirth);
        res.json({
            learnToEarnEligible: eligible,
            eligibilityReason: eligible ? null : 'institution_required',
            balanceCents: w.balanceCents,
            lifetimeEarnedCents: w.lifetimeEarnedCents,
            lifetimePaidOutCents: w.lifetimePaidOutCents,
            dateOfBirthSet: !!user.dateOfBirth,
            ageYears: age,
            requiresParentalConsentForPayout: requiresParentalConsentForPayout(age),
            parentConsentVerified: !!user.scholarshipPayout?.parentConsentVerified,
        });
    } catch (err) {
        logger.error('[scholarship] getWallet', { error: err.message });
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route GET /api/scholarship/ledger
 * @access Private (student)
 */
const getLedger = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('role studentInstitution');
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Not available' });
        }
        const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
        const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
        if (!isStudentLearnToEarnEligible(user)) {
            return res.json({
                learnToEarnEligible: false,
                items: [],
                total: 0,
                limit,
                skip,
            });
        }
        const [items, total] = await Promise.all([
            ScholarshipLedgerEntry.find({ user: req.user.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ScholarshipLedgerEntry.countDocuments({ user: req.user.id }),
        ]);
        res.json({ learnToEarnEligible: true, items, total, limit, skip });
    } catch (err) {
        logger.error('[scholarship] getLedger', { error: err.message });
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route GET /api/scholarship/payout-requests
 * @access Private (student)
 */
const getMyPayoutRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('role studentInstitution');
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Not available' });
        }
        if (!isStudentLearnToEarnEligible(user)) {
            return res.json([]);
        }
        const list = await ScholarshipPayoutRequest.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.json(list);
    } catch (err) {
        logger.error('[scholarship] getMyPayoutRequests', { error: err.message });
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route POST /api/scholarship/payout-request
 * @access Private (student)
 * body: { amountCents, parentConsentAttested? }
 */
const postPayoutRequest = async (req, res) => {
    try {
        const amountCents = parseInt(req.body.amountCents, 10);
        const parentConsentAttested = !!req.body.parentConsentAttested;
        if (!Number.isFinite(amountCents) || amountCents < 1) {
            return res.status(400).json({ message: 'Invalid amountCents' });
        }
        const pr = await createPayoutRequest(req.user.id, amountCents, parentConsentAttested);
        res.status(201).json(pr);
    } catch (err) {
        const code = err.statusCode || 500;
        if (code >= 500) logger.error('[scholarship] postPayoutRequest', { error: err.message });
        // Only surface err.message for 4xx (these are deliberately-typed errors
        // with safe, user-meaningful messages). 5xx paths return a generic
        // string so we never leak unexpected internals.
        const safeMessage = code < 500 ? (err.message || 'Bad request') : 'Server error';
        res.status(code).json({ message: safeMessage });
    }
};

/**
 * @route PUT /api/scholarship/admin/verify-parent-consent/:userId
 * @access Admin
 */
const adminVerifyParentConsent = async (req, res) => {
    try {
        const target = await User.findById(req.params.userId);
        if (!target || target.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }
        target.scholarshipPayout = target.scholarshipPayout || {};
        target.scholarshipPayout.parentConsentVerified = true;
        target.scholarshipPayout.parentConsentVerifiedAt = new Date();
        target.scholarshipPayout.parentConsentVerifiedBy = req.user.id;
        await target.save();
        const out = target.toObject();
        delete out.password;
        res.json({ message: 'Parental consent verified', user: out });
    } catch (err) {
        logger.error('[scholarship] adminVerifyParentConsent', { error: err.message });
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route GET /api/scholarship/admin/payout-requests
 * @access Admin
 *
 * Canonical paginated endpoint. Query params:
 *   - status: 'pending' (default) | 'approved' | 'rejected' | 'paid' | 'all'
 *   - page:   1-indexed page number, default 1
 *   - pageSize: 1..100, default 20
 *
 * Response shape (see utils/pagination.js):
 *   { data, page, pageSize, total, totalPages, hasMore }
 */
const adminListPayoutRequests = async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        const q = status === 'all' ? {} : { status };
        const { page, pageSize, skip, limit } = parsePagination(req, {
            defaultPageSize: 20,
            maxPageSize: 100,
        });

        const [items, total] = await Promise.all([
            ScholarshipPayoutRequest.find(q)
                .populate('user', 'name email dateOfBirth scholarshipPayout')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ScholarshipPayoutRequest.countDocuments(q),
        ]);

        res.json(paginatedResponse(items, total, { page, pageSize }));
    } catch (err) {
        logger.error('[scholarship] adminListPayoutRequests', { error: err.message });
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route PUT /api/scholarship/admin/payout-requests/:id/reject
 * @access Admin
 */
const adminRejectPayout = async (req, res) => {
    try {
        const pr = await rejectPayoutRequest(req.params.id, req.user.id, req.body.adminNotes);
        res.json(pr);
    } catch (err) {
        const code = err.statusCode || 500;
        if (code >= 500) logger.error('[scholarship] adminRejectPayout', { error: err.message });
        const safeMessage = code < 500 ? (err.message || 'Bad request') : 'Server error';
        res.status(code).json({ message: safeMessage });
    }
};

/**
 * @route PUT /api/scholarship/admin/payout-requests/:id/mark-paid
 * @access Admin (operational — funds already debited at request time)
 */
const adminMarkPayoutPaid = async (req, res) => {
    try {
        const pr = await ScholarshipPayoutRequest.findById(req.params.id);
        if (!pr || pr.status !== 'pending') {
            return res.status(400).json({ message: 'Request not found or not pending' });
        }
        pr.status = 'paid';
        pr.reviewedBy = req.user.id;
        pr.reviewedAt = new Date();
        if (req.body.adminNotes) pr.adminNotes = req.body.adminNotes;
        await pr.save();
        res.json(pr);
    } catch (err) {
        logger.error('[scholarship] adminMarkPayoutPaid', { error: err.message });
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getPublicConfig,
    getWallet,
    getLedger,
    getMyPayoutRequests,
    postPayoutRequest,
    adminVerifyParentConsent,
    adminListPayoutRequests,
    adminRejectPayout,
    adminMarkPayoutPaid,
};
