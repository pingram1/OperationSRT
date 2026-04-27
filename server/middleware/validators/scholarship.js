/**
 * Validators for /api/scholarship/* endpoints.
 */
const { body, param, query } = require('express-validator');

const objectIdParam = (name) => param(name)
    .matches(/^[a-fA-F0-9]{24}$/)
    .withMessage(`${name} must be a valid ObjectId`);

// Cap payout requests at $50,000 (5_000_000 cents) — defense in depth.
// The service layer enforces wallet balance; this just blocks absurd inputs.
const MAX_PAYOUT_CENTS = 5_000_000;

const postPayoutRequest = [
    body('amountCents')
        .isInt({ min: 1, max: MAX_PAYOUT_CENTS })
        .withMessage(`amountCents must be a positive integer (max ${MAX_PAYOUT_CENTS})`),
    body('parentConsentAttested')
        .optional()
        .isBoolean().withMessage('parentConsentAttested must be a boolean'),
];

const verifyConsent = [objectIdParam('userId')];
const requestIdParam = [objectIdParam('id')];

const adminReject = [
    ...requestIdParam,
    body('adminNotes')
        .optional({ nullable: true })
        .isString()
        .isLength({ max: 2000 })
        .withMessage('adminNotes must be ≤ 2000 characters'),
];

const adminListPayoutRequests = [
    query('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected', 'paid', 'all'])
        .withMessage('status must be pending | approved | rejected | paid | all'),
    query('page')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('page must be a positive integer'),
    query('pageSize')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('pageSize must be between 1 and 100'),
];

module.exports = {
    postPayoutRequest,
    verifyConsent,
    requestIdParam,
    adminReject,
    adminListPayoutRequests,
};
