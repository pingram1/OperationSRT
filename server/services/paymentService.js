/**
 * Payment service.
 *
 * Holds the side-effects that happen when a Stripe charge succeeds or
 * fails — booking state mutation, idempotent transaction recording, and
 * post-payment fulfillment (membership activation, etc.). Extracted from
 * `paymentController` so:
 *
 *   - The controller is HTTP-shaped and small (request → call service → respond).
 *   - The service is independently unit-testable without mocking Express.
 *   - Webhook + sync confirm paths share one canonical implementation,
 *     so they cannot drift.
 *
 * Pattern: services do NOT touch req/res, do NOT throw HTTP-specific
 * errors. They throw plain Errors (or ApiError) that the controller can
 * shape. They return plain values, not response payloads.
 */

const Transaction = require('../models/Transaction');
const { applyMembershipAfterPayment } = require('../controllers/membershipController');
const logger = require('../utils/logger');

/**
 * Idempotent: only one Transaction is ever created per Stripe PaymentIntent
 * (keyed on `gatewayTransactionId`).
 *
 * @param {object} params
 * @param {object} params.booking            Mongoose booking doc (must have _id, subject, student/user).
 * @param {object} params.paymentIntent      Stripe PaymentIntent (or webhook event.data.object).
 * @param {'confirm'|'webhook'} params.source Distinguishes transactionId prefix.
 * @returns {Promise<{ created: boolean }>} created=true if a new Transaction was inserted.
 */
async function recordPaymentTransaction({ booking, paymentIntent, source }) {
    if (!booking || !paymentIntent?.id) {
        throw new Error('recordPaymentTransaction requires booking and paymentIntent');
    }
    const existing = await Transaction.findOne({ gatewayTransactionId: paymentIntent.id });
    if (existing) {
        return { created: false };
    }

    const studentId = booking.student?._id || booking.student || booking.user;
    const paidUsd = paymentIntent.amount / 100;
    const prefix = source === 'webhook' ? 'txn_w_' : 'txn_';

    const transaction = new Transaction({
        transactionId: `${prefix}${Date.now()}_${booking._id}`,
        user: studentId,
        type: 'Payment',
        amount: paidUsd,
        currency: (paymentIntent.currency || 'usd').toUpperCase(),
        status: 'Completed',
        booking: booking._id,
        paymentMethod: 'Credit Card',
        gatewayTransactionId: paymentIntent.id,
        description: `Payment for ${booking.subject || 'tutoring'} tutoring session`,
    });
    await transaction.save();
    return { created: true };
}

/**
 * Update the booking's customerPayment subdocument to reflect a successful
 * charge. Always sets stripePaymentIntentId (idempotent for re-runs from
 * the webhook) so confirm + webhook paths converge.
 *
 * @param {object} booking
 * @param {object} paymentIntent
 * @returns {Promise<void>}
 */
async function markBookingPaid(booking, paymentIntent) {
    if (!booking?.save) {
        throw new Error('markBookingPaid requires a Mongoose booking doc');
    }
    if (!booking.customerPayment) booking.customerPayment = {};
    booking.customerPayment.stripePaymentIntentId = paymentIntent.id;
    booking.customerPayment.status = 'paid';
    booking.customerPayment.paidAt = new Date();
    await booking.save();
}

/**
 * Update the booking's customerPayment to reflect a failed charge.
 *
 * @param {object} booking
 * @returns {Promise<void>}
 */
async function markBookingFailed(booking) {
    if (!booking?.save) {
        throw new Error('markBookingFailed requires a Mongoose booking doc');
    }
    if (!booking.customerPayment) booking.customerPayment = {};
    booking.customerPayment.status = 'failed';
    await booking.save();
}

/**
 * Run any post-payment fulfillment for a booking — currently membership
 * activation. Errors here are LOGGED, not propagated, because the payment
 * itself is already recorded; we don't want a downstream fulfillment hiccup
 * to make a successful charge look failed to the caller.
 *
 * @param {object} booking
 * @param {object} [paymentIntent]
 * @returns {Promise<void>}
 */
async function finalizeAfterSuccessfulCharge(booking, paymentIntent) {
    if (!booking || booking.paymentPurpose !== 'membership') return;
    try {
        const result = await applyMembershipAfterPayment(booking);
        if (result?.applied) {
            logger.info('Membership activated after successful payment', {
                bookingId: booking._id,
                paymentIntentId: paymentIntent?.id,
            });
        }
    } catch (e) {
        logger.error('finalizeAfterSuccessfulCharge: membership application failed', {
            bookingId: booking?._id,
            message: e.message,
        });
    }
}

module.exports = {
    recordPaymentTransaction,
    markBookingPaid,
    markBookingFailed,
    finalizeAfterSuccessfulCharge,
};
