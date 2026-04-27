const Stripe = require('stripe');
let _stripe;
/** @returns {import('stripe').Stripe | null} */
function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    if (!_stripe) _stripe = new Stripe(key);
    return _stripe;
}

const Booking = require('../models/Booking');
const ProcessedStripeEvent = require('../models/ProcessedStripeEvent');
const logger = require('../utils/logger');
const { canUserAccessBooking } = require('../utils/bookingAccess');
const {
    recordPaymentTransaction,
    markBookingPaid,
    markBookingFailed,
    finalizeAfterSuccessfulCharge,
} = require('../services/paymentService');

/**
 * @desc    Create a payment intent for a booking
 * @route   POST /api/payments/create-intent
 * @access  Private
 * Amount is always taken from the booking record (server-computed at booking creation), never from the client.
 */
const createPaymentIntent = async (req, res) => {
    try {
        const { bookingId, currency = 'USD' } = req.body;
        const userId = req.user.id;

        const booking = await Booking.findById(bookingId)
            .populate('user', 'name email')
            .populate('student', 'name email');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (!(await canUserAccessBooking(req, booking))) {
            return res.status(403).json({ message: 'Not authorized to pay for this booking' });
        }

        if (booking.customerPayment?.status === 'paid') {
            return res.status(400).json({ message: 'This booking has already been paid' });
        }

        const priceUsd = Number(booking.price);
        if (!Number.isFinite(priceUsd) || priceUsd < 0) {
            return res.status(400).json({ message: 'This booking has no valid price. It cannot be paid online.' });
        }
        if (priceUsd === 0) {
            return res.status(400).json({ message: 'Nothing to pay for this booking' });
        }

        const amountCents = Math.round(priceUsd * 100);
        if (amountCents < 1) {
            return res.status(400).json({ message: 'Payment amount is too small' });
        }

        const stripe = getStripe();
        if (!stripe) {
            return res.status(503).json({ message: 'Payment processing is not configured (STRIPE_SECRET_KEY).' });
        }

        let customerId = booking.customerPayment?.stripeCustomerId;
        if (!customerId) {
            const customerEmail = booking.user.email || booking.student.email;
            const customer = await stripe.customers.create({
                email: customerEmail,
                name: booking.user.name || booking.student.name,
                metadata: {
                    userId: userId,
                    bookingId: bookingId.toString(),
                },
            });
            customerId = customer.id;

            if (!booking.customerPayment) {
                booking.customerPayment = {};
            }
            booking.customerPayment.stripeCustomerId = customerId;
        }

        const sessionCfg = booking.membershipSessionConfiguration
            ? JSON.stringify(booking.membershipSessionConfiguration)
            : '';

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: String(currency).toLowerCase(),
            customer: customerId,
            metadata: {
                bookingId: String(bookingId),
                userId: String(userId),
                studentId: booking.student._id.toString(),
                tutorId: booking.tutor ? booking.tutor.toString() : 'TBD',
                subject: String(booking.subject || ''),
                serviceType: String(booking.serviceType || ''),
                paymentPurpose: booking.paymentPurpose || 'session',
                membershipPlanId: booking.membershipPlanId ? String(booking.membershipPlanId) : '',
                membershipSessionConfig: sessionCfg.length > 450 ? sessionCfg.slice(0, 450) : sessionCfg,
            },
            description: `Tutoring session: ${booking.subject} - ${booking.serviceType}`,
        });

        if (!booking.customerPayment) {
            booking.customerPayment = {};
        }
        booking.customerPayment.stripePaymentIntentId = paymentIntent.id;
        booking.customerPayment.status = 'pending';
        booking.customerPayment.amount = priceUsd;
        booking.customerPayment.currency = String(currency).toUpperCase();
        await booking.save();

        logger.info('Created payment intent for booking', { bookingId, amountCents });

        return res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (err) {
        logger.error('createPaymentIntent', { message: err.message });
        return res.status(500).json({ message: 'Failed to create payment intent' });
    }
};

/**
 * @desc    Confirm payment and update booking status
 * @route   POST /api/payments/confirm
 * @access  Private
 */
const confirmPayment = async (req, res) => {
    try {
        const stripe = getStripe();
        if (!stripe) {
            return res.status(503).json({ message: 'Payment processing is not configured (STRIPE_SECRET_KEY).' });
        }

        const { paymentIntentId, bookingId } = req.body;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                message: 'Payment not completed',
                status: paymentIntent.status,
            });
        }

        const booking = await Booking.findById(bookingId)
            .populate('user', 'name email')
            .populate('student', 'name email _id');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (!(await canUserAccessBooking(req, booking))) {
            return res.status(403).json({ message: 'Not authorized to confirm payment for this booking' });
        }

        if (booking.customerPayment?.stripePaymentIntentId !== paymentIntentId) {
            return res.status(400).json({ message: 'Payment intent does not match booking' });
        }

        const paidUsd = paymentIntent.amount / 100;
        const expected = Number(booking.price);
        if (Number.isFinite(expected) && Math.abs(paidUsd - expected) > 0.02) {
            logger.warn('Payment amount does not match booking price', { bookingId, paidUsd, expected });
            return res.status(400).json({ message: 'Payment amount does not match the booking' });
        }

        await markBookingPaid(booking, paymentIntent);
        await recordPaymentTransaction({ booking, paymentIntent, source: 'confirm' });
        await finalizeAfterSuccessfulCharge(booking, paymentIntent);

        logger.info('Payment confirmed for booking', { bookingId });

        return res.json({
            message: 'Payment confirmed successfully',
            booking,
        });
    } catch (err) {
        logger.error('confirmPayment', { message: err.message });
        return res.status(500).json({ message: 'Failed to confirm payment' });
    }
};

/**
 * @desc    Handle Stripe webhook events
 * @route   POST /api/payments/webhook
 * @access  Public (Stripe signature verification)
 */
const handleWebhook = async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
        return res.status(503).send('Payment processing is not configured');
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        logger.error('Webhook signature verification failed', { message: err.message });
        return res.status(400).send('Webhook signature verification failed');
    }

    // Idempotency: insert a 'received' record. On duplicate-key, this is a
    // retry — we re-run the handler unless the previous attempt finished
    // (status === 'processed'). Legacy rows without `status` are treated as
    // already processed to avoid replaying historic events.
    try {
        await ProcessedStripeEvent.create({ eventId: event.id, type: event.type, status: 'received' });
    } catch (dupErr) {
        if (dupErr.code !== 11000) {
            logger.error('Webhook idempotency record failed', { eventId: event.id, message: dupErr.message });
            return res.status(500).json({ received: false, error: 'idempotency_record_failed' });
        }
        const existing = await ProcessedStripeEvent.findOne({ eventId: event.id }).lean();
        const isProcessed = !existing || !existing.status || existing.status === 'processed';
        if (isProcessed) {
            logger.info('Stripe webhook duplicate (already processed)', { eventId: event.id, type: event.type });
            return res.json({ received: true, duplicate: true });
        }
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailure(event.data.object);
                break;
            default:
                logger.info('Stripe webhook: unhandled event', { type: event.type });
        }
    } catch (e) {
        logger.error('Webhook handler error', { type: event.type, eventId: event.id, message: e.message });
        await ProcessedStripeEvent.updateOne(
            { eventId: event.id },
            { $set: { status: 'failed', lastError: String(e.message || '').slice(0, 500) } },
        ).catch((updateErr) => {
            logger.error('Failed to mark webhook failed', { eventId: event.id, message: updateErr.message });
        });
        // Return 5xx so Stripe retries the delivery; the next attempt will
        // re-enter this handler because status !== 'processed'.
        return res.status(500).json({ received: false, error: 'handler_failed' });
    }

    await ProcessedStripeEvent.updateOne(
        { eventId: event.id },
        { $set: { status: 'processed', lastError: null } },
    ).catch((e) => {
        logger.error('Failed to mark webhook processed', { eventId: event.id, message: e.message });
    });
    return res.json({ received: true });
};

const handlePaymentSuccess = async (paymentIntent) => {
    const bookingId = paymentIntent.metadata?.bookingId;
    if (!bookingId) {
        logger.error('handlePaymentSuccess: no bookingId in metadata');
        return;
    }

    const booking = await Booking.findById(bookingId).populate('student', '_id');
    if (!booking) {
        logger.error('handlePaymentSuccess: booking not found', { bookingId });
        return;
    }

    const paidUsd = paymentIntent.amount / 100;
    const expected = Number(booking.price);
    if (Number.isFinite(expected) && Math.abs(paidUsd - expected) > 0.02) {
        logger.error('handlePaymentSuccess: amount mismatch; not marking paid', { bookingId, paidUsd, expected });
        return;
    }

    await markBookingPaid(booking, paymentIntent);
    await recordPaymentTransaction({ booking, paymentIntent, source: 'webhook' });
    await finalizeAfterSuccessfulCharge(booking, paymentIntent);

    logger.info('handlePaymentSuccess completed', { bookingId });
};

const handlePaymentFailure = async (paymentIntent) => {
    const bookingId = paymentIntent.metadata?.bookingId;
    if (!bookingId) {
        logger.error('handlePaymentFailure: no bookingId in metadata');
        return;
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        logger.error('handlePaymentFailure: booking not found', { bookingId });
        return;
    }

    await markBookingFailed(booking);

    logger.info('handlePaymentFailure: updated booking', { bookingId });
};

/**
 * @desc    Get payment status for a booking
 * @route   GET /api/payments/status/:bookingId
 * @access  Private
 */
const getPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (!(await canUserAccessBooking(req, booking))) {
            return res.status(403).json({ message: 'Not authorized to view this payment status' });
        }

        let paymentIntentStatus = null;
        const stripe = getStripe();
        if (stripe && booking.customerPayment?.stripePaymentIntentId) {
            try {
                const pi = await stripe.paymentIntents.retrieve(booking.customerPayment.stripePaymentIntentId);
                paymentIntentStatus = pi.status;
            } catch (err) {
                logger.error('getPaymentStatus retrieve PI', { message: err.message });
            }
        }

        return res.json({
            bookingId: booking._id,
            paymentStatus: booking.customerPayment?.status || null,
            paymentIntentStatus,
            amount: booking.customerPayment?.amount ?? booking.price ?? null,
            currency: booking.customerPayment?.currency || 'USD',
            paidAt: booking.customerPayment?.paidAt || null,
        });
    } catch (err) {
        logger.error('getPaymentStatus', { message: err.message });
        return res.status(500).json({ message: 'Failed to get payment status' });
    }
};

module.exports = {
    createPaymentIntent,
    confirmPayment,
    handleWebhook,
    getPaymentStatus,
};
