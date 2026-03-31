const { calculatePayroll, getPayrollSummary, isTutorPayable } = require('../utils/payrollUtils');
const User = require('../models/User');

/**
 * @desc    Get tutor payroll/earnings summary
 * @route   GET /api/payroll/me
 * @access  Private (Tutor)
 */
const getTutorPayroll = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can access this endpoint' });
        }

        const { startDate, endDate } = req.query;
        const dateRange = {};
        if (startDate) dateRange.startDate = startDate;
        if (endDate) dateRange.endDate = endDate;

        const summary = await getPayrollSummary(req.user.id, dateRange);

        if (summary.error) {
            return res.status(500).json({ message: summary.error });
        }

        console.log(`[getTutorPayroll] Payroll summary for tutor ${req.user.id}`);
        res.json(summary);
    } catch (err) {
        console.error('[getTutorPayroll] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching payroll', error: err.message });
    }
};

/**
 * @desc    Calculate unpaid earnings for tutor
 * @route   GET /api/payroll/me/unpaid
 * @access  Private (Tutor)
 */
const getUnpaidEarnings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can access this endpoint' });
        }

        const result = await calculatePayroll(req.user.id);

        console.log(`[getUnpaidEarnings] Unpaid earnings for tutor ${req.user.id}: $${result.totalAmount}`);
        res.json(result);
    } catch (err) {
        console.error('[getUnpaidEarnings] Error:', err.message);
        res.status(500).json({ message: 'Server error while calculating unpaid earnings', error: err.message });
    }
};

/**
 * @desc    Check tutor compliance/payable status
 * @route   GET /api/payroll/me/compliance
 * @access  Private (Tutor)
 */
const checkCompliance = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can access this endpoint' });
        }

        const compliance = await isTutorPayable(req.user.id);

        res.json(compliance);
    } catch (err) {
        console.error('[checkCompliance] Error:', err.message);
        res.status(500).json({ message: 'Server error while checking compliance', error: err.message });
    }
};

module.exports = {
    getTutorPayroll,
    getUnpaidEarnings,
    checkCompliance,
};


