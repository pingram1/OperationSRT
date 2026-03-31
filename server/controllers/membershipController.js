const MembershipPlan = require('../models/MembershipPlan');
const User = require('../models/User');
const Booking = require('../models/Booking');

/**
 * @desc    Get all available membership plans
 * @route   GET /api/memberships
 * @access  Public (can be accessed by anyone viewing plans)
 */
const getAllPlans = async (req, res) => {
    try {
        const plans = await MembershipPlan.find({ isActive: true })
            .sort({ price: -1 }); // Sort by price descending
        
        res.json(plans);
    } catch (err) {
        console.error('Error fetching membership plans:', err.message);
        res.status(500).json({ message: 'Server error while fetching plans' });
    }
};

/**
 * @desc    Get a specific membership plan by ID
 * @route   GET /api/memberships/:id
 * @access  Public
 */
const getPlanById = async (req, res) => {
    try {
        const plan = await MembershipPlan.findById(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ message: 'Membership plan not found' });
        }
        
        res.json(plan);
    } catch (err) {
        console.error('Error fetching membership plan:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Get current user's membership
 * @route   GET /api/memberships/current
 * @access  Private
 */
const getCurrentMembership = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('membership.planId')
            .select('membership');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user.membership);
    } catch (err) {
        console.error('Error fetching current membership:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get sessions allowed per month from plan + user session config
 */
const getSessionsAllowedPerMonth = (plan, sessionConfig) => {
    if (!plan?.sessionConfig) return null;
    const base = plan.sessionConfig.sessionsPerMonth || 4;
    if (!sessionConfig?.additionalOption) return base;
    const opt = plan.sessionConfig.additionalSessionOptions?.find(
        o => o.label === sessionConfig.additionalOption || (o.sessionsPerWeek === sessionConfig.sessionsPerWeek && o.sessionDuration === sessionConfig.sessionDuration)
    );
    if (opt) return (opt.sessionsPerWeek || 2) * 4; // ~4 weeks per month
    return base;
};

/**
 * @desc    Get remaining sessions for current month (students with session-based membership)
 * @route   GET /api/memberships/remaining-sessions
 * @access  Private
 * Returns { sessionsAllowed, sessionsUsed, remaining, promptSchedule } for student, or array for parent's children
 */
const getRemainingSessions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('membership.planId')
            .populate({ path: 'children', select: 'name', populate: { path: 'membership.planId' } });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const computeForStudent = async (student) => {
            const membership = student.membership;
            const plan = membership?.planId;
            if (!plan || membership?.status !== 'active' || plan.priceType !== 'monthly') return null;
            const allowed = getSessionsAllowedPerMonth(plan, membership?.sessionConfiguration);
            if (allowed == null) return null;
            const used = await Booking.countDocuments({
                student: student._id,
                status: { $in: ['scheduled', 'completed'] },
                sessionDate: { $gte: startOfMonth, $lte: endOfMonth },
            });
            const remaining = Math.max(0, allowed - used);
            return { studentId: student._id, studentName: student.name, sessionsAllowed: allowed, sessionsUsed: used, remaining, promptSchedule: remaining > 0 };
        };

        if (user.role === 'parent' && user.children?.length > 0) {
            const results = [];
            for (const child of user.children) {
                const childFull = await User.findById(child._id).populate('membership.planId').lean();
                const r = await computeForStudent(childFull);
                if (r && r.promptSchedule) results.push(r);
            }
            return res.json({ students: results });
        }

        if (user.role === 'student') {
            const r = await computeForStudent(user);
            if (!r) return res.json({ sessionsAllowed: 0, sessionsUsed: 0, remaining: 0, promptSchedule: false });
            return res.json(r);
        }

        return res.json({ sessionsAllowed: 0, sessionsUsed: 0, remaining: 0, promptSchedule: false });
    } catch (err) {
        console.error('Error fetching remaining sessions:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Select/Subscribe to a membership plan
 * @route   POST /api/memberships/select
 * @access  Private
 */
const selectPlan = async (req, res) => {
    try {
        const { planId, sessionConfiguration, studentId } = req.body;
        
        // Validate plan exists
        const plan = await MembershipPlan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({ message: 'Membership plan not found or inactive' });
        }
        
        // Validate session configuration for Summa Cum Laude
        if (plan.name === 'Summa Cum Laude' && sessionConfiguration) {
            const { sessionsPerWeek, sessionDuration, additionalOption } = sessionConfiguration;
            
            // Validate base configuration
            if (!sessionsPerWeek || !sessionDuration) {
                return res.status(400).json({ 
                    message: 'Session configuration required for Summa Cum Laude plan' 
                });
            }
            
            // Validate against plan options
            const baseConfig = plan.sessionConfig;
            const isValidBase = sessionsPerWeek === baseConfig.baseSessionsPerWeek && 
                              sessionDuration === baseConfig.baseSessionDuration;
            
            const isValidAdditional = plan.sessionConfig.additionalSessionOptions.some(
                opt => opt.sessionsPerWeek === sessionsPerWeek && 
                       opt.sessionDuration === sessionDuration &&
                       (additionalOption ? opt.label === additionalOption : true)
            );
            
            if (!isValidBase && !isValidAdditional) {
                return res.status(400).json({ 
                    message: 'Invalid session configuration for this plan' 
                });
            }
        }
        
        // Determine which user to update
        let targetUser = await User.findById(req.user.id);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // If parent is selecting membership for a specific child
        if (req.user.role === 'parent' && studentId) {
            // Verify the student is linked to this parent
            const parent = targetUser;
            if (!parent.children || !parent.children.includes(studentId)) {
                return res.status(403).json({ message: 'Not authorized to change membership for this student' });
            }
            
            // Get the student user
            targetUser = await User.findById(studentId);
            if (!targetUser) {
                return res.status(404).json({ message: 'Student not found' });
            }
            if (targetUser.role !== 'student') {
                return res.status(400).json({ message: 'Target user is not a student' });
            }
        }
        
        // Calculate end date (for monthly plans, add 1 month)
        let endDate = null;
        if (plan.priceType === 'monthly') {
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);
        }
        
        const membershipData = {
            plan: plan.name,
            planId: plan._id,
            startDate: new Date(),
            endDate: endDate,
            status: 'active',
            sessionConfiguration: sessionConfiguration || null,
        };
        
        // Update target user's membership
        targetUser.membership = membershipData;
        await targetUser.save();
        
        // Sync membership with linked accounts
        if (targetUser.role === 'parent' && targetUser.children && targetUser.children.length > 0) {
            // If parent is selecting plan, sync to all linked children
            await User.updateMany(
                { _id: { $in: targetUser.children } },
                { $set: { membership: membershipData } }
            );
            console.log(`[selectPlan] Synced membership to ${targetUser.children.length} linked children for parent ${targetUser._id}`);
        } else if (targetUser.role === 'student') {
            // If student is selecting plan (or parent selected for student), sync to linked parent(s)
            const parents = await User.find({
                role: 'parent',
                children: targetUser._id
            });
            
            if (parents.length > 0) {
                await User.updateMany(
                    { _id: { $in: parents.map(p => p._id) } },
                    { $set: { membership: membershipData } }
                );
                console.log(`[selectPlan] Synced membership to ${parents.length} linked parent(s) for student ${targetUser._id}`);
            }
        }
        
        // Return membership info with plan details (return the target user's membership)
        const updatedUser = await User.findById(targetUser._id)
            .populate('membership.planId')
            .select('membership');
        
        res.json({
            message: 'Membership plan selected successfully',
            membership: updatedUser.membership,
        });
    } catch (err) {
        console.error('Error selecting membership plan:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Initialize/Seed membership plans (Admin only - for initial setup)
 * @route   POST /api/memberships/initialize
 * @access  Private/Admin
 */
const initializePlans = async (req, res) => {
    try {
        // Check if plans already exist
        const existingPlans = await MembershipPlan.find();
        if (existingPlans.length > 0) {
            return res.status(400).json({ 
                message: 'Membership plans already initialized. Use update endpoints instead.' 
            });
        }
        
        // Create default plans
        const plans = [
            {
                name: 'Summa Cum Laude',
                subtitle: 'Long-Term Member',
                price: 259.99,
                priceType: 'monthly',
                priceDisplay: '$259.99/mo',
                features: [
                    'Enhanced AI-driven learning plans',
                    'Exclusive access to premium content',
                    'Special member-only webinars',
                    'Personalized progress tracking',
                ],
                isFeatured: true,
                sessionConfig: {
                    baseSessionsPerWeek: 1,
                    baseSessionDuration: 60,
                    sessionsPerMonth: 4, // 4 hours total per month
                    additionalSessionOptions: [
                        {
                            label: '2 one-hour sessions per week',
                            sessionsPerWeek: 2,
                            sessionDuration: 60,
                            additionalCost: 130.00, // $389.99 - $259.99 = $130.00 (8 hours total)
                        },
                        {
                            label: '1 two-hour session per week',
                            sessionsPerWeek: 1,
                            sessionDuration: 120,
                            additionalCost: 130.00, // $389.99 - $259.99 = $130.00 (8 hours total)
                        },
                    ],
                },
            },
            {
                name: 'Magna Cum Laude',
                subtitle: 'Active Member',
                price: 65,
                priceType: 'per_session',
                priceDisplay: '$65/session',
                features: [
                    'Access to personalized resources',
                    'Interactive study guides',
                    'Priority scheduling for follow-ups',
                ],
                isFeatured: false,
            },
            {
                name: 'Cum Laude',
                subtitle: 'Basic Access User',
                price: 0,
                priceType: 'free',
                priceDisplay: 'Free',
                features: [
                    'Basic learning models',
                    'Limited use of AI assistants',
                    'Preview access to platform features',
                ],
                isFeatured: false,
            },
        ];
        
        const createdPlans = await MembershipPlan.insertMany(plans);
        
        res.json({
            message: 'Membership plans initialized successfully',
            plans: createdPlans,
        });
    } catch (err) {
        console.error('Error initializing membership plans:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllPlans,
    getPlanById,
    getCurrentMembership,
    getRemainingSessions,
    selectPlan,
    initializePlans,
};

