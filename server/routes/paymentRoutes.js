const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/AuthMiddleware');
const {
    createPaymentIntent,
    confirmPayment,
    handleWebhook,
    getPaymentStatus,
} = require('../controllers/paymentController');

// Webhook route must be before body parser middleware (handled in server.js)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/create-intent', authMiddleware, createPaymentIntent);
router.post('/confirm', authMiddleware, confirmPayment);
router.get('/status/:bookingId', authMiddleware, getPaymentStatus);

module.exports = router;





