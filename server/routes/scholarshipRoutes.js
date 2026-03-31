const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
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
router.post('/payout-request', authMiddleware, postPayoutRequest);

router.put(
    '/admin/verify-parent-consent/:userId',
    authMiddleware,
    authorize('admin', 'super_admin'),
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
    adminRejectPayout
);
router.put(
    '/admin/payout-requests/:id/mark-paid',
    authMiddleware,
    authorize('admin', 'super_admin'),
    adminMarkPayoutPaid
);

module.exports = router;
