const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * @desc    Create a payment intent for a booking
 * @route   POST /api/payments/create-intent
 * @access  Private
 */
const createPaymentIntent = async (req, res) => {
    try {
        const { bookingId, amount, currency = 'USD' } = req.body;
        const userId = req.user.id;

        // Verify booking exists and belongs to user
        const booking = await Booking.findById(bookingId)
            .populate('user', 'name email')
            .populate('student', 'name email');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check authorization
        let isAuthorized = 
            booking.user._id.toString() === userId ||
            booking.student._id.toString() === userId ||
            req.user.role === 'admin' ||
            req.user.role === 'super_admin';

        // If user is a parent, check if the booking's student is one of their children
        if (!isAuthorized && req.user.role === 'parent') {
            const user = await User.findById(userId);
            if (user && user.children && user.children.length > 0) {
                const studentId = booking.student._id.toString();
                const childrenIds = user.children.map(child => 
                    (child._id || child).toString()
                );
                if (childrenIds.includes(studentId)) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to pay for this booking' });
        }

        // Check if already paid
        if (booking.customerPayment?.status === 'paid') {
            return res.status(400).json({ message: 'This booking has already been paid' });
        }

        // Get or create Stripe customer
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

            // Save customer ID to booking
            if (!booking.customerPayment) {
                booking.customerPayment = {};
            }
            booking.customerPayment.stripeCustomerId = customerId;
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase(),
            customer: customerId,
            metadata: {
                bookingId: bookingId.toString(),
                userId: userId,
                studentId: booking.student._id.toString(),
                tutorId: booking.tutor ? booking.tutor.toString() : 'TBD',
                subject: booking.subject,
                serviceType: booking.serviceType,
            },
            description: `Tutoring session: ${booking.subject} - ${booking.serviceType}`,
        });

        // Update booking with payment intent
        if (!booking.customerPayment) {
            booking.customerPayment = {};
        }
        booking.customerPayment.stripePaymentIntentId = paymentIntent.id;
        booking.customerPayment.status = 'pending';
        booking.customerPayment.amount = amount;
        booking.customerPayment.currency = currency;
        await booking.save();

        console.log(`[createPaymentIntent] Created payment intent ${paymentIntent.id} for booking ${bookingId}`);

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (err) {
        console.error('[createPaymentIntent] Error:', err.message);
        res.status(500).json({ message: 'Failed to create payment intent', error: err.message });
    }
};

/**
 * @desc    Confirm payment and update booking status
 * @route   POST /api/payments/confirm
 * @access  Private
 */
const confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId, bookingId } = req.body;
        const userId = req.user.id;

        // Verify payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
                message: 'Payment not completed', 
                status: paymentIntent.status 
            });
        }

        // Find booking
        const booking = await Booking.findById(bookingId)
            .populate('user', 'name email')
            .populate('student', 'name email _id');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check authorization - allow parent to confirm payment for their child's booking
        let isAuthorized = 
            booking.user._id.toString() === userId ||
            booking.student._id.toString() === userId ||
            req.user.role === 'admin' ||
            req.user.role === 'super_admin';

        // If user is a parent, check if the booking's student is one of their children
        if (!isAuthorized && req.user.role === 'parent') {
            const user = await User.findById(userId);
            if (user && user.children && user.children.length > 0) {
                const studentId = booking.student._id.toString();
                const childrenIds = user.children.map(child => 
                    (child._id || child).toString()
                );
                if (childrenIds.includes(studentId)) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to confirm payment for this booking' });
        }

        // Verify payment intent matches booking
        if (booking.customerPayment?.stripePaymentIntentId !== paymentIntentId) {
            return res.status(400).json({ message: 'Payment intent does not match booking' });
        }

        // Update booking payment status
        if (!booking.customerPayment) {
            booking.customerPayment = {};
        }
        booking.customerPayment.status = 'paid';
        booking.customerPayment.paidAt = new Date();
        await booking.save();

        // Create transaction record
        // Use the student's ID for the transaction since the payment is for their booking
        // (even if a parent is making the payment)
        const studentId = booking.student._id || booking.student;
        const transaction = new Transaction({
            transactionId: `txn_${Date.now()}_${bookingId}`,
            user: studentId,
            type: 'Payment',
            amount: paymentIntent.amount / 100, // Convert from cents
            currency: paymentIntent.currency.toUpperCase(),
            status: 'Completed',
            booking: bookingId,
            paymentMethod: 'Credit Card',
            gatewayTransactionId: paymentIntentId,
            description: `Payment for ${booking.subject} tutoring session`,
        });
        await transaction.save();

        console.log(`[confirmPayment] Payment confirmed for booking ${bookingId}`);

        res.json({
            message: 'Payment confirmed successfully',
            booking: booking,
            transaction: transaction,
        });
    } catch (err) {
        console.error('[confirmPayment] Error:', err.message);
        res.status(500).json({ message: 'Failed to confirm payment', error: err.message });
    }
};

/**
 * @desc    Handle Stripe webhook events
 * @route   POST /api/payments/webhook
 * @access  Public (Stripe signature verification)
 */
const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('[handleWebhook] Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            await handlePaymentSuccess(paymentIntent);
            break;
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            await handlePaymentFailure(failedPayment);
            break;
        default:
            console.log(`[handleWebhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
};

/**
 * Helper function to handle successful payment
 */
const handlePaymentSuccess = async (paymentIntent) => {
    try {
        const bookingId = paymentIntent.metadata.bookingId;
        if (!bookingId) {
            console.error('[handlePaymentSuccess] No bookingId in metadata');
            return;
        }

        const booking = await Booking.findById(bookingId)
            .populate('student', '_id');
        if (!booking) {
            console.error(`[handlePaymentSuccess] Booking ${bookingId} not found`);
            return;
        }

        // Update booking payment status
        if (!booking.customerPayment) {
            booking.customerPayment = {};
        }
        booking.customerPayment.status = 'paid';
        booking.customerPayment.paidAt = new Date();
        await booking.save();

        // Create transaction record if it doesn't exist
        const existingTransaction = await Transaction.findOne({
            gatewayTransactionId: paymentIntent.id,
        });

        if (!existingTransaction) {
            // Use the student's ID for the transaction since the payment is for their booking
            const studentId = booking.student?._id || booking.student || booking.user;
            const transaction = new Transaction({
                transactionId: `txn_${Date.now()}_${bookingId}`,
                user: studentId,
                type: 'Payment',
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                status: 'Completed',
                booking: bookingId,
                paymentMethod: 'Credit Card',
                gatewayTransactionId: paymentIntent.id,
                description: `Payment for ${booking.subject} tutoring session`,
            });
            await transaction.save();
        }

        console.log(`[handlePaymentSuccess] Payment processed for booking ${bookingId}`);
    } catch (err) {
        console.error('[handlePaymentSuccess] Error:', err.message);
    }
};

/**
 * Helper function to handle failed payment
 */
const handlePaymentFailure = async (paymentIntent) => {
    try {
        const bookingId = paymentIntent.metadata.bookingId;
        if (!bookingId) {
            console.error('[handlePaymentFailure] No bookingId in metadata');
            return;
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            console.error(`[handlePaymentFailure] Booking ${bookingId} not found`);
            return;
        }

        // Update booking payment status
        if (!booking.customerPayment) {
            booking.customerPayment = {};
        }
        booking.customerPayment.status = 'failed';
        await booking.save();

        console.log(`[handlePaymentFailure] Payment failed for booking ${bookingId}`);
    } catch (err) {
        console.error('[handlePaymentFailure] Error:', err.message);
    }
};

/**
 * @desc    Get payment status for a booking
 * @route   GET /api/payments/status/:bookingId
 * @access  Private
 */
const getPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check authorization
        let isAuthorized = 
            booking.user.toString() === userId ||
            booking.student.toString() === userId ||
            req.user.role === 'admin' ||
            req.user.role === 'super_admin';

        // If user is a parent, check if the booking's student is one of their children
        if (!isAuthorized && req.user.role === 'parent') {
            const user = await User.findById(userId);
            if (user && user.children && user.children.length > 0) {
                const studentId = booking.student.toString();
                const childrenIds = user.children.map(child => 
                    (child._id || child).toString()
                );
                if (childrenIds.includes(studentId)) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to view this payment status' });
        }

        // If payment intent exists, get latest status from Stripe
        let paymentIntentStatus = null;
        if (booking.customerPayment?.stripePaymentIntentId) {
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(
                    booking.customerPayment.stripePaymentIntentId
                );
                paymentIntentStatus = paymentIntent.status;
            } catch (err) {
                console.error('[getPaymentStatus] Error retrieving payment intent:', err.message);
            }
        }

        res.json({
            bookingId: booking._id,
            paymentStatus: booking.customerPayment?.status || null,
            paymentIntentStatus: paymentIntentStatus,
            amount: booking.customerPayment?.amount || null,
            currency: booking.customerPayment?.currency || 'USD',
            paidAt: booking.customerPayment?.paidAt || null,
        });
    } catch (err) {
        console.error('[getPaymentStatus] Error:', err.message);
        res.status(500).json({ message: 'Failed to get payment status', error: err.message });
    }
};

module.exports = {
    createPaymentIntent,
    confirmPayment,
    handleWebhook,
    getPaymentStatus,
};





