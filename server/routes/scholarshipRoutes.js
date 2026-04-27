const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const { validateRequest } = require('../middleware/validate');
const scholarshipValidators = require('../middleware/validators/scholarship');
const {
    getPublicConfig,
    getWallet,
    getLedger,
    getMyPayoutRequests,
    postPayoutRequest,
    adminVerifyParentConsent,
    adminListPayoutRequests,
    adminRejectPayout,
    adminMarkPayoutPaid,
} = require('../controllers/scholarshipController');

router.get('/config', getPublicConfig);

router.get('/wallet', authMiddleware, getWallet);
router.get('/ledger', authMiddleware, getLedger);
router.get('/payout-requests', authMiddleware, getMyPayoutRequests);
router.post(
    '/payout-request',
    authMiddleware,
    scholarshipValidators.postPayoutRequest,
    validateRequest,
    postPayoutRequest,
);

router.put(
    '/admin/verify-parent-consent/:userId',
    authMiddleware,
    authorize('admin', 'super_admin'),
    scholarshipValidators.verifyConsent,
    validateRequest,
    adminVerifyParentConsent
);
router.get(
    '/admin/payout-requests',
    authMiddleware,
    authorize('admin', 'super_admin'),
    adminListPayoutRequests
);
router.put(
    '/admin/payout-requests/:id/reject',
    authMiddleware,
    authorize('admin', 'super_admin'),
    scholarshipValidators.adminReject,
    validateRequest,
    adminRejectPayout
);
router.put(
    '/admin/payout-requests/:id/mark-paid',
    authMiddleware,
    authorize('admin', 'super_admin'),
    scholarshipValidators.requestIdParam,
    validateRequest,
    adminMarkPayoutPaid
);

module.exports = router;
