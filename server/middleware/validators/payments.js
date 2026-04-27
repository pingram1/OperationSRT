/**
 * Validators for /api/payments/* endpoints.
 */
const { body, param } = require('express-validator');

const objectId = (location, name) => location(name)
    .isString().withMessage(`${name} must be a string`)
    .bail()
    .matches(/^[a-fA-F0-9]{24}$/)
    .withMessage(`${name} must be a valid ObjectId`);

const createIntent = [
    objectId(body, 'bookingId'),
];

const confirm = [
    body('paymentIntentId')
        .isString().withMessage('paymentIntentId must be a string')
        .bail()
        .matches(/^pi_[A-Za-z0-9_]{8,}$/)
        .withMessage('paymentIntentId must look like a Stripe payment intent id (pi_...)'),
    objectId(body, 'bookingId'),
];

const status = [
    objectId(param, 'bookingId'),
];

module.exports = { createIntent, confirm, status };
