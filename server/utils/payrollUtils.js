const User = require('../models/User');
const Booking = require('../models/Booking');

/**
 * Pay rate mapping for tiered flat-rate model
 */
const PAY_RATES = {
    Tier_1: 18.00,
    Tier_2: 25.00,
    Tier_3: 35.00,
    Group: 70.00, // Group sessions override tier rates
};

/**
 * Check if a tutor is payable (compliant for payroll)
 * @param {string} tutorId - The tutor's user ID
 * @returns {Promise<{isPayable: boolean, reason?: string}>}
 */
const isTutorPayable = async (tutorId) => {
    try {
        const tutor = await User.findById(tutorId);
        
        if (!tutor || tutor.role !== 'tutor') {
            return { isPayable: false, reason: 'Tutor not found or invalid role' };
        }

        // Check if tutor status is Active
        if (tutor.tutorInfo?.status !== 'active') {
            return { isPayable: false, reason: `Tutor status is ${tutor.tutorInfo?.status || 'unknown'}. Must be 'active' to receive payment.` };
        }

        // Check tax form status based on contractor type
        const contractorType = tutor.tutorInfo?.contractorType;
        const taxFormStatus = tutor.tutorInfo?.taxFormStatus;

        if (!contractorType) {
            return { isPayable: false, reason: 'Contractor type not set' };
        }

        if (!taxFormStatus || taxFormStatus === 'Pending') {
            return { isPayable: false, reason: 'Tax form not completed. Must complete W9 (US) or W8BEN (International) to receive payment.' };
        }

        // Validate tax form matches contractor type
        if (contractorType === 'US' && taxFormStatus !== 'W9_Complete') {
            return { isPayable: false, reason: 'US contractors must have W9_Complete status' };
        }

        if (contractorType === 'International' && taxFormStatus !== 'W8BEN_Complete') {
            return { isPayable: false, reason: 'International contractors must have W8BEN_Complete status' };
        }

        return { isPayable: true };
    } catch (error) {
        console.error('[isTutorPayable] Error:', error);
        return { isPayable: false, reason: 'Error checking tutor compliance' };
    }
};

/**
 * Calculate payroll for a tutor based on completed, unpaid sessions
 * @param {string} tutorId - The tutor's user ID
 * @param {Array} sessionsList - Optional list of sessions (if not provided, will fetch from DB)
 * @returns {Promise<{totalAmount: number, sessionCount: number, breakdown: Array, isPayable: boolean, complianceReason?: string}>}
 */
const calculatePayroll = async (tutorId, sessionsList = null) => {
    try {
        // Check if tutor is payable
        const complianceCheck = await isTutorPayable(tutorId);
        if (!complianceCheck.isPayable) {
            return {
                totalAmount: 0,
                sessionCount: 0,
                breakdown: [],
                isPayable: false,
                complianceReason: complianceCheck.reason,
            };
        }

        // Get tutor info to determine pay tier
        const tutor = await User.findById(tutorId);
        if (!tutor || tutor.role !== 'tutor') {
            return {
                totalAmount: 0,
                sessionCount: 0,
                breakdown: [],
                isPayable: false,
                complianceReason: 'Tutor not found',
            };
        }

        const payTier = tutor.tutorInfo?.payTier;
        if (!payTier) {
            return {
                totalAmount: 0,
                sessionCount: 0,
                breakdown: [],
                isPayable: true,
                complianceReason: 'Pay tier not set for tutor',
            };
        }

        // Fetch sessions if not provided
        let sessions = sessionsList;
        if (!sessions) {
            sessions = await Booking.find({
                tutor: tutorId,
                status: 'completed',
                paymentStatus: 'Unpaid',
            })
                .populate('student', 'name')
                .sort({ sessionDate: -1 });
        }

        // Filter to only completed, unpaid sessions
        const eligibleSessions = sessions.filter(session => {
            return session.status === 'completed' && session.paymentStatus === 'Unpaid';
        });

        let totalAmount = 0;
        const breakdown = [];

        eligibleSessions.forEach(session => {
            let sessionPay = 0;
            let payType = '';

            // Check if it's a group session (overrides tier rate)
            if (session.serviceType === 'group') {
                sessionPay = PAY_RATES.Group;
                payType = 'Group Session';
            } else if (session.serviceType === 'consult') {
                // Consultations are paid at half the tier rate
                if (payTier && PAY_RATES[payTier]) {
                    sessionPay = PAY_RATES[payTier] / 2;
                    payType = payTier.replace('_', ' ') + ' Rate (Consultation - 50%)';
                } else {
                    sessionPay = 0;
                    payType = 'Rate not set';
                }
            } else if (payTier && PAY_RATES[payTier]) {
                // Use full tier-based rate for solo sessions
                sessionPay = PAY_RATES[payTier];
                payType = payTier.replace('_', ' ') + ' Rate';
            } else {
                // Fallback if pay tier is not set
                sessionPay = 0;
                payType = 'Rate not set';
            }

            totalAmount += sessionPay;

            breakdown.push({
                sessionId: session._id,
                sessionDate: session.sessionDate,
                studentName: session.student?.name || 'Unknown',
                subject: session.subject,
                serviceType: session.serviceType,
                payAmount: sessionPay,
                payType: payType,
                duration: session.duration,
            });
        });

        return {
            totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
            sessionCount: eligibleSessions.length,
            breakdown: breakdown,
            isPayable: true,
            payTier: payTier,
        };
    } catch (error) {
        console.error('[calculatePayroll] Error:', error);
        return {
            totalAmount: 0,
            sessionCount: 0,
            breakdown: [],
            isPayable: false,
            complianceReason: 'Error calculating payroll',
        };
    }
};

/**
 * Get payroll summary for a tutor (including paid and unpaid sessions)
 * @param {string} tutorId - The tutor's user ID
 * @param {Object} dateRange - Optional { startDate, endDate }
 * @returns {Promise<Object>}
 */
const getPayrollSummary = async (tutorId, dateRange = {}) => {
    try {
        const tutor = await User.findById(tutorId);
        if (!tutor || tutor.role !== 'tutor') {
            return {
                error: 'Tutor not found',
            };
        }

        const payTier = tutor.tutorInfo?.payTier;
        const complianceCheck = await isTutorPayable(tutorId);

        // Build query for completed sessions
        const query = {
            tutor: tutorId,
            status: 'completed',
        };

        if (dateRange.startDate || dateRange.endDate) {
            query.sessionDate = {};
            if (dateRange.startDate) {
                query.sessionDate.$gte = new Date(dateRange.startDate);
            }
            if (dateRange.endDate) {
                query.sessionDate.$lte = new Date(dateRange.endDate);
            }
        }

        const allCompletedSessions = await Booking.find(query)
            .populate('student', 'name')
            .sort({ sessionDate: -1 });

        // Calculate unpaid earnings
        const unpaidResult = await calculatePayroll(tutorId, allCompletedSessions.filter(s => s.paymentStatus === 'Unpaid'));

        // Calculate paid earnings
        const paidSessions = allCompletedSessions.filter(s => s.paymentStatus === 'Paid');
        let paidAmount = 0;
        paidSessions.forEach(session => {
            if (session.serviceType === 'group') {
                paidAmount += PAY_RATES.Group;
            } else if (session.serviceType === 'consult') {
                // Consultations are paid at half the tier rate
                paidAmount += (PAY_RATES[payTier] || 0) / 2;
            } else {
                // Solo sessions get full tier rate
                paidAmount += PAY_RATES[payTier] || 0;
            }
        });
        paidAmount = Math.round(paidAmount * 100) / 100;

        // Get monthly breakdown
        const monthlyBreakdown = {};
        allCompletedSessions.forEach(session => {
            const monthKey = new Date(session.sessionDate).toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyBreakdown[monthKey]) {
                monthlyBreakdown[monthKey] = {
                    month: monthKey,
                    paid: 0,
                    unpaid: 0,
                    sessionCount: 0,
                };
            }
            monthlyBreakdown[monthKey].sessionCount++;
            if (session.serviceType === 'group') {
                if (session.paymentStatus === 'Paid') {
                    monthlyBreakdown[monthKey].paid += PAY_RATES.Group;
                } else {
                    monthlyBreakdown[monthKey].unpaid += PAY_RATES.Group;
                }
            } else if (session.serviceType === 'consult') {
                // Consultations are paid at half the tier rate
                const amount = (PAY_RATES[payTier] || 0) / 2;
                if (session.paymentStatus === 'Paid') {
                    monthlyBreakdown[monthKey].paid += amount;
                } else {
                    monthlyBreakdown[monthKey].unpaid += amount;
                }
            } else {
                // Solo sessions get full tier rate
                const amount = PAY_RATES[payTier] || 0;
                if (session.paymentStatus === 'Paid') {
                    monthlyBreakdown[monthKey].paid += amount;
                } else {
                    monthlyBreakdown[monthKey].unpaid += amount;
                }
            }
        });

        return {
            tutor: {
                id: tutor._id,
                name: tutor.name,
                email: tutor.email,
                payTier: payTier,
                contractorType: tutor.tutorInfo?.contractorType,
                taxFormStatus: tutor.tutorInfo?.taxFormStatus,
                status: tutor.tutorInfo?.status,
            },
            compliance: complianceCheck,
            unpaid: {
                totalAmount: unpaidResult.totalAmount,
                sessionCount: unpaidResult.sessionCount,
                breakdown: unpaidResult.breakdown,
            },
            paid: {
                totalAmount: Math.round(paidAmount * 100) / 100,
                sessionCount: paidSessions.length,
            },
            totalEarnings: Math.round((unpaidResult.totalAmount + paidAmount) * 100) / 100,
            monthlyBreakdown: Object.values(monthlyBreakdown).sort((a, b) => b.month.localeCompare(a.month)),
            payRates: PAY_RATES,
        };
    } catch (error) {
        console.error('[getPayrollSummary] Error:', error);
        return {
            error: 'Error fetching payroll summary',
        };
    }
};

module.exports = {
    isTutorPayable,
    calculatePayroll,
    getPayrollSummary,
    PAY_RATES,
};

