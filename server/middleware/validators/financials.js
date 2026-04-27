/**
 * Validators for /api/financials/* endpoints.
 */
const { body, query } = require('express-validator');

const revenueTrend = [
    query('days')
        .optional()
        .isInt({ min: 1, max: 730 })
        .withMessage('days must be an integer between 1 and 730'),
];

const transactions = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 500 })
        .withMessage('limit must be an integer between 1 and 500'),
    query('search')
        .optional({ nullable: true })
        .isString()
        .isLength({ max: 100 })
        .withMessage('search must be ≤ 100 characters'),
    query('childId')
        .optional({ nullable: true })
        .matches(/^[a-fA-F0-9]{24}$/)
        .withMessage('childId must be a valid ObjectId'),
];

const createTransaction = [
    body('userId')
        .matches(/^[a-fA-F0-9]{24}$/)
        .withMessage('userId must be a valid ObjectId'),
    body('type')
        .isIn(['Payment', 'Refund', 'Invoice'])
        .withMessage('type must be Payment, Refund, or Invoice'),
    body('amount')
        .isFloat({ min: 0, max: 1_000_000 })
        .withMessage('amount must be a positive number ≤ 1,000,000'),
    body('description')
        .optional({ nullable: true })
        .isString()
        .isLength({ max: 500 }),
    body('bookingId')
        .optional({ nullable: true })
        .matches(/^[a-fA-F0-9]{24}$/)
        .withMessage('bookingId must be a valid ObjectId'),
    body('membershipPlanId')
        .optional({ nullable: true })
        .matches(/^[a-fA-F0-9]{24}$/)
        .withMessage('membershipPlanId must be a valid ObjectId'),
    body('paymentMethod')
        .optional({ nullable: true })
        .isString()
        .isLength({ max: 100 }),
    body('dueDate')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('dueDate must be ISO 8601'),
];

module.exports = { revenueTrend, transactions, createTransaction };
