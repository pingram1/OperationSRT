const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const {
    getFinancialStats,
    getRevenueTrend,
    getTransactions,
    createTransaction,
} = require('../controllers/financialsController');

/**
 * @route   GET /api/financials/stats
 * @desc    Get financial statistics (revenue, MRR, subscriptions, overdue invoices)
 * @access  Private (Admin only)
 */
router.get('/stats', authMiddleware, authorize('admin'), getFinancialStats);

/**
 * @route   GET /api/financials/revenue-trend
 * @desc    Get revenue trend data for chart
 * @access  Private (Admin only)
 */
router.get('/revenue-trend', authMiddleware, authorize('admin'), getRevenueTrend);

/**
 * @route   GET /api/financials/transactions
 * @desc    Get recent transactions (Admin: all, Parent: their children's, User: their own)
 * @access  Private
 */
router.get('/transactions', authMiddleware, getTransactions);

/**
 * @route   POST /api/financials/transactions
 * @desc    Create a new transaction
 * @access  Private (Admin only)
 */
router.post('/transactions', authMiddleware, authorize('admin'), createTransaction);

module.exports = router;

