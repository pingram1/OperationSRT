const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/AuthMiddleware');
const {
    createPaymentIntent,
    confirmPayment,
    getPaymentStatus,
} = require('../controllers/paymentController');

// Protected routes
router.post('/create-intent', authMiddleware, createPaymentIntent);
router.post('/confirm', authMiddleware, confirmPayment);
router.get('/status/:bookingId', authMiddleware, getPaymentStatus);

module.exports = router;





