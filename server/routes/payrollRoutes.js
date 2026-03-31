const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/AuthMiddleware');
const {
    getTutorPayroll,
    getUnpaidEarnings,
    checkCompliance,
} = require('../controllers/payrollController');

/**
 * @route   GET /api/payroll/me
 * @desc    Get tutor payroll/earnings summary
 * @access  Private (Tutor)
 */
router.get('/me', authMiddleware, getTutorPayroll);

/**
 * @route   GET /api/payroll/me/unpaid
 * @desc    Get unpaid earnings for tutor
 * @access  Private (Tutor)
 */
router.get('/me/unpaid', authMiddleware, getUnpaidEarnings);

/**
 * @route   GET /api/payroll/me/compliance
 * @desc    Check tutor compliance status
 * @access  Private (Tutor)
 */
router.get('/me/compliance', authMiddleware, checkCompliance);

module.exports = router;












