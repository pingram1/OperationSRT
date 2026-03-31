const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

/**
 * @desc    Get financial statistics
 * @route   GET /api/financials/stats
 * @access  Private (Admin only)
 */
const getFinancialStats = async (req, res) => {
    try {
        // Calculate total revenue (sum of all completed payments minus refunds)
        const totalRevenueResult = await Transaction.aggregate([
            {
                $match: {
                    status: 'Completed',
                    type: { $in: ['Payment', 'Refund'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        // Calculate previous period revenue for comparison (last 30 days before current period)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const currentPeriodRevenue = await Transaction.aggregate([
            {
                $match: {
                    status: 'Completed',
                    type: { $in: ['Payment', 'Refund'] },
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const previousPeriodRevenue = await Transaction.aggregate([
            {
                $match: {
                    status: 'Completed',
                    type: { $in: ['Payment', 'Refund'] },
                    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const currentRevenue = currentPeriodRevenue.length > 0 ? currentPeriodRevenue[0].total : 0;
        const previousRevenue = previousPeriodRevenue.length > 0 ? previousPeriodRevenue[0].total : 0;
        const revenueChange = previousRevenue > 0 
            ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
            : 0;

        // Calculate Monthly Recurring Revenue (MRR) - sum of active subscription payments
        const activeMemberships = await User.countDocuments({
            'membership.plan': { $exists: true, $ne: null },
            'membership.status': 'active'
        });

        // Get all active membership plans and calculate MRR
        const activePlans = await MembershipPlan.find({ isActive: true });
        let mrr = 0;
        for (const plan of activePlans) {
            const usersOnPlan = await User.countDocuments({
                'membership.plan': plan._id,
                'membership.status': 'active'
            });
            mrr += (plan.price * usersOnPlan);
        }

        // Calculate previous month MRR for comparison
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

        const lastMonthMRRResult = await Transaction.aggregate([
            {
                $match: {
                    status: 'Completed',
                    type: 'Payment',
                    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
                    membershipPlan: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const lastMonthMRR = lastMonthMRRResult.length > 0 ? lastMonthMRRResult[0].total : 0;
        const mrrChange = lastMonthMRR > 0 
            ? ((mrr - lastMonthMRR) / lastMonthMRR * 100).toFixed(1)
            : 0;

        // Count active subscriptions
        const previousMonthActiveSubs = await Transaction.countDocuments({
            status: 'Completed',
            type: 'Payment',
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
            membershipPlan: { $exists: true, $ne: null }
        });
        const activeSubsChange = activeMemberships - previousMonthActiveSubs;

        // Count overdue invoices
        const now = new Date();
        const overdueInvoices = await Transaction.countDocuments({
            type: 'Invoice',
            status: 'Overdue',
            dueDate: { $lt: now }
        });

        // Also check for invoices that should be marked as overdue
        await Transaction.updateMany(
            {
                type: 'Invoice',
                status: { $ne: 'Completed' },
                dueDate: { $lt: now }
            },
            {
                $set: { status: 'Overdue' }
            }
        );

        res.json({
            totalRevenue: totalRevenue.toFixed(2),
            totalRevenueChange: revenueChange > 0 ? `+${revenueChange}%` : `${revenueChange}%`,
            mrr: mrr.toFixed(2),
            mrrChange: mrrChange > 0 ? `+${mrrChange}%` : `${mrrChange}%`,
            activeSubscriptions: activeMemberships,
            activeSubscriptionsChange: activeSubsChange > 0 ? `+${activeSubsChange}` : `${activeSubsChange}`,
            overdueInvoices: overdueInvoices,
        });
    } catch (error) {
        console.error('[getFinancialStats] Error:', error);
        res.status(500).json({ message: 'Server error while fetching financial stats', error: error.message });
    }
};

/**
 * @desc    Get revenue trend data for chart
 * @route   GET /api/financials/revenue-trend
 * @access  Private (Admin only)
 */
const getRevenueTrend = async (req, res) => {
    try {
        const { days = 90 } = req.query;
        const daysNum = parseInt(days, 10);
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);

        // Determine interval based on number of days
        let intervalDays;
        if (daysNum <= 7) {
            intervalDays = 1; // Daily
        } else if (daysNum <= 30) {
            intervalDays = 1; // Daily for 30 days
        } else {
            intervalDays = Math.ceil(daysNum / 30); // ~30 data points for 90 days
        }

        const revenueData = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const intervalEnd = new Date(currentDate);
            intervalEnd.setDate(intervalEnd.getDate() + intervalDays);
            const actualEnd = intervalEnd > endDate ? new Date(endDate) : intervalEnd;

            const revenue = await Transaction.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        type: { $in: ['Payment', 'Refund'] },
                        createdAt: { $gte: currentDate, $lt: actualEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);

            revenueData.push({
                date: currentDate.toISOString(),
                revenue: revenue.length > 0 ? revenue[0].total : 0,
            });

            currentDate.setDate(currentDate.getDate() + intervalDays);
            if (revenueData.length >= 30) break; // Limit to 30 data points
        }

        res.json(revenueData);
    } catch (error) {
        console.error('[getRevenueTrend] Error:', error);
        res.status(500).json({ message: 'Server error while fetching revenue trend', error: error.message });
    }
};

/**
 * @desc    Get recent transactions
 * @route   GET /api/financials/transactions
 * @access  Private (Admin only, or Parent for their children)
 */
const getTransactions = async (req, res) => {
    try {
        const { limit = 50, search = '', childId } = req.query;
        const limitNum = parseInt(limit, 10);
        const user = await User.findById(req.user.id);

        let query = {};
        
        // If user is a parent, only show transactions for their children
        if (user && user.role === 'parent') {
            if (childId) {
                // Specific child requested - verify it's their child
                if (!user.children || !user.children.includes(childId)) {
                    return res.status(403).json({ message: 'Not authorized to view transactions for this child' });
                }
                query.user = childId;
            } else {
                // All children's transactions
                if (!user.children || user.children.length === 0) {
                    return res.json([]);
                }
                query.user = { $in: user.children };
            }
        } else if (user && (user.role === 'admin' || user.role === 'super_admin')) {
            // Admin can see all transactions
        // If search term provided, search by user name or transaction ID
        if (search) {
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            
            const userIds = users.map(u => u._id);
            
            query = {
                $or: [
                    { transactionId: { $regex: search, $options: 'i' } },
                    { user: { $in: userIds } }
                ]
            };
            }
        } else {
            // Regular users can only see their own transactions
            query.user = req.user.id;
        }

        const transactions = await Transaction.find(query)
            .populate('user', 'name email')
            .populate('booking', 'subject sessionDate')
            .populate('membershipPlan', 'name price')
            .sort({ createdAt: -1 })
            .limit(limitNum);

        // Format transactions for frontend
        const formattedTransactions = transactions.map(txn => ({
            id: txn.transactionId,
            user: txn.user?.name || 'Unknown User',
            userId: txn.user?._id,
            type: txn.type,
            amount: txn.amount,
            date: txn.createdAt.toISOString(),
            status: txn.status,
            description: txn.description,
            paymentMethod: txn.paymentMethod,
            booking: txn.booking ? {
                id: txn.booking._id,
                subject: txn.booking.subject,
                sessionDate: txn.booking.sessionDate
            } : null,
        }));

        res.json(formattedTransactions);
    } catch (error) {
        console.error('[getTransactions] Error:', error);
        res.status(500).json({ message: 'Server error while fetching transactions', error: error.message });
    }
};

/**
 * @desc    Create a new transaction
 * @route   POST /api/financials/transactions
 * @access  Private (Admin only)
 */
const createTransaction = async (req, res) => {
    try {
        const { userId, type, amount, description, bookingId, membershipPlanId, paymentMethod, dueDate } = req.body;

        // Validate required fields
        if (!userId || !type || amount === undefined) {
            return res.status(400).json({ message: 'userId, type, and amount are required' });
        }

        // Generate unique transaction ID
        const count = await Transaction.countDocuments();
        const transactionId = `txn_${count + 1}`;

        const transaction = new Transaction({
            transactionId,
            user: userId,
            type,
            amount: parseFloat(amount),
            description: description || '',
            booking: bookingId || null,
            membershipPlan: membershipPlanId || null,
            paymentMethod: paymentMethod || '',
            dueDate: dueDate ? new Date(dueDate) : null,
            status: type === 'Invoice' ? 'Pending' : 'Completed',
            paidDate: type === 'Payment' ? new Date() : null,
        });

        const savedTransaction = await transaction.save();
        await savedTransaction.populate('user', 'name email');

        res.status(201).json(savedTransaction);
    } catch (error) {
        console.error('[createTransaction] Error:', error);
        res.status(500).json({ message: 'Server error while creating transaction', error: error.message });
    }
};

module.exports = {
    getFinancialStats,
    getRevenueTrend,
    getTransactions,
    createTransaction,
};

