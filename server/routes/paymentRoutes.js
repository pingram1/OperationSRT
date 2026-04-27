const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/AuthMiddleware');
const { validateRequest } = require('../middleware/validate');
const paymentValidators = require('../middleware/validators/payments');
const {
    createPaymentIntent,
    confirmPayment,
    getPaymentStatus,
} = require('../controllers/paymentController');

router.post(
    '/create-intent',
    authMiddleware,
    paymentValidators.createIntent,
    validateRequest,
    createPaymentIntent,
);

router.post(
    '/confirm',
    authMiddleware,
    paymentValidators.confirm,
    validateRequest,
    confirmPayment,
);

router.get(
    '/status/:bookingId',
    authMiddleware,
    paymentValidators.status,
    validateRequest,
    getPaymentStatus,
);

module.exports = router;
