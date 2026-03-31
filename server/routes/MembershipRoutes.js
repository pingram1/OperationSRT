const express = require('express');
const router = express.Router();

const {
    getAllPlans,
    getPlanById,
    getCurrentMembership,
    getRemainingSessions,
    selectPlan,
    initializePlans,
} = require('../controllers/membershipController');

const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');

/**
 * @route   GET /api/memberships
 * @desc    Get all available membership plans
 * @access  Public
 */
router.get('/', getAllPlans);

/**
 * @route   GET /api/memberships/current
 * @desc    Get current user's membership
 * @access  Private
 */
router.get('/current', authMiddleware, getCurrentMembership);

/**
 * @route   GET /api/memberships/remaining-sessions
 * @desc    Get remaining sessions for current month (students with session-based membership)
 * @access  Private
 */
router.get('/remaining-sessions', authMiddleware, getRemainingSessions);

/**
 * @route   GET /api/memberships/:id
 * @desc    Get a specific membership plan by ID
 * @access  Public
 * Note: This route must come after /current to avoid route conflicts
 */
router.get('/:id', getPlanById);

/**
 * @route   POST /api/memberships/select
 * @desc    Select/Subscribe to a membership plan
 * @access  Private
 */
router.post('/select', authMiddleware, selectPlan);

/**
 * @route   POST /api/memberships/initialize
 * @desc    Initialize/Seed membership plans (Admin only)
 * @access  Private/Admin
 */
router.post('/initialize', authMiddleware, authorize('admin'), initializePlans);

module.exports = router;

