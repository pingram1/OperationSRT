const User = require('../models/User');
const Booking = require('../models/Booking');
const bcrypt = require('bcryptjs');
const { sendTutorAccountEmail } = require('../utils/emailService');

/**
 * @desc    Get all tutors with their status
 * @route   GET /api/tutors
 * @access  Private (Admin)
 */
const getAllTutors = async (req, res) => {
    try {
        // Find all users with role 'tutor' OR super_admin who are available as tutor
        const tutors = await User.find({
            $or: [
                { role: 'tutor' },
                { role: 'super_admin', availableAsTutor: true }
            ]
        })
            .select('-password')
            .select('name email avatar role tutorInfo createdAt availableAsTutor')
            .sort({ createdAt: -1 });
        
        console.log(`[getAllTutors] Found ${tutors.length} tutors`);
        res.json(tutors);
    } catch (err) {
        console.error('Error in getAllTutors:', err.message);
        res.status(500).json({ message: 'Server error while fetching tutors' });
    }
};

/**
 * @desc    Get pending tutor applications
 * @route   GET /api/tutors/pending
 * @access  Private (Admin)
 */
const getPendingApplications = async (req, res) => {
    try {
        // Find tutors with pending status or no tutorInfo (legacy tutors)
        const pendingTutors = await User.find({ 
            role: 'tutor',
            $or: [
                { 'tutorInfo.status': 'pending' },
                { 'tutorInfo.status': { $exists: false } },
                { tutorInfo: { $exists: false } }
            ]
        })
            .select('-password')
            .select('name email avatar role tutorInfo createdAt')
            .sort({ createdAt: -1 });
        
        console.log(`[getPendingApplications] Found ${pendingTutors.length} pending applications`);
        res.json(pendingTutors);
    } catch (err) {
        console.error('Error in getPendingApplications:', err.message);
        res.status(500).json({ message: 'Server error while fetching pending applications' });
    }
};

/**
 * @desc    Get active tutors
 * @route   GET /api/tutors/active
 * @access  Private (Admin)
 */
const getActiveTutors = async (req, res) => {
    try {
        // Find tutors that are active or legacy (no status field = treat as active)
        const activeTutors = await User.find({ 
            role: 'tutor',
            $or: [
                { 'tutorInfo.status': 'active' },
                { 'tutorInfo.status': { $exists: false } },
                { tutorInfo: { $exists: false } },
                { 'tutorInfo.status': null }
            ]
        })
            .select('-password')
            .select('name email avatar role tutorInfo createdAt')
            .sort({ 'tutorInfo.hireDate': -1, createdAt: -1 });
        
        console.log(`[getActiveTutors] Found ${activeTutors.length} active tutors`);
        res.json(activeTutors);
    } catch (err) {
        console.error('Error in getActiveTutors:', err.message);
        res.status(500).json({ message: 'Server error while fetching active tutors' });
    }
};

/**
 * @desc    Get tutor management stats
 * @route   GET /api/tutors/stats
 * @access  Private (Admin)
 */
const getTutorStats = async (req, res) => {
    try {
        const pendingCount = await User.countDocuments({ 
            role: 'tutor',
            $or: [
                { 'tutorInfo.status': 'pending' },
                { 'tutorInfo.status': { $exists: false } },
                { tutorInfo: { $exists: false } }
            ]
        });
        
        // Count active tutors (active status or legacy tutors without status)
        const activeCount = await User.countDocuments({ 
            role: 'tutor',
            $or: [
                { 'tutorInfo.status': 'active' },
                { 'tutorInfo.status': { $exists: false } },
                { tutorInfo: { $exists: false } },
                { 'tutorInfo.status': null }
            ]
        });
        
        // Calculate new tutors in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Count tutors that are active (or legacy) and were created/hired in last 30 days
        const newTutors = await User.find({
            role: 'tutor',
            $and: [
                {
                    $or: [
                        { 'tutorInfo.status': 'active' },
                        { 'tutorInfo.status': { $exists: false } },
                        { tutorInfo: { $exists: false } },
                        { 'tutorInfo.status': null }
                    ]
                },
                {
                    $or: [
                        { 'tutorInfo.hireDate': { $gte: thirtyDaysAgo } },
                        { createdAt: { $gte: thirtyDaysAgo } } // Fallback to createdAt if hireDate not set
                    ]
                }
            ]
        });
        
        const newTutorsCount = newTutors.length;
        
        // Calculate total monthly payroll
        // If using hourly rate, we'd need session data - for now, use monthlySalary
        const activeTutorsForPayroll = await User.find({ 
            role: 'tutor',
            $or: [
                { 'tutorInfo.status': 'active' },
                { 'tutorInfo.status': { $exists: false } },
                { tutorInfo: { $exists: false } },
                { 'tutorInfo.status': null }
            ]
        }).select('tutorInfo.monthlySalary tutorInfo.hourlyRate');
        
        let totalPayroll = 0;
        activeTutorsForPayroll.forEach(tutor => {
            if (tutor.tutorInfo?.monthlySalary) {
                totalPayroll += tutor.tutorInfo.monthlySalary;
            } else if (tutor.tutorInfo?.hourlyRate) {
                // Estimate: assume 40 hours/week * 4 weeks * hourly rate
                // This is a placeholder - in production, you'd calculate from actual hours worked
                totalPayroll += (tutor.tutorInfo.hourlyRate * 160);
            }
        });
        
        const stats = {
            pendingApplications: pendingCount,
            activeTutors: activeCount,
            newTutorsLast30Days: newTutorsCount,
            totalMonthlyPayroll: totalPayroll
        };
        
        console.log(`[getTutorStats] Stats:`, stats);
        res.json(stats);
    } catch (err) {
        console.error('Error in getTutorStats:', err.message);
        res.status(500).json({ message: 'Server error while fetching tutor stats' });
    }
};

/**
 * @desc    Approve a tutor application
 * @route   PUT /api/tutors/:id/approve
 * @access  Private (Admin)
 */
const approveTutor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can approve tutors' });
        }
        
        const tutor = await User.findById(req.params.id);
        if (!tutor || tutor.role !== 'tutor') {
            return res.status(404).json({ message: 'Tutor not found' });
        }
        
        // Update tutor status and set hire date
        if (!tutor.tutorInfo) {
            tutor.tutorInfo = {
                subjects: [],
                status: 'active',
                hireDate: new Date(),
            };
        } else {
            tutor.tutorInfo.status = 'active';
            if (!tutor.tutorInfo.hireDate) {
                tutor.tutorInfo.hireDate = new Date();
            }
        }
        
        await tutor.save();
        
        console.log(`[approveTutor] Approved tutor: ${tutor.name} (${tutor.email})`);
        
        res.json({
            message: 'Tutor approved successfully',
            tutor: {
                id: tutor._id,
                name: tutor.name,
                email: tutor.email,
                tutorInfo: tutor.tutorInfo
            }
        });
    } catch (err) {
        console.error('Error in approveTutor:', err.message);
        res.status(500).json({ message: 'Server error while approving tutor' });
    }
};

/**
 * @desc    Deny/reject a tutor application
 * @route   DELETE /api/tutors/:id
 * @access  Private (Admin)
 */
const denyTutor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can deny tutors' });
        }
        
        const tutor = await User.findById(req.params.id);
        if (!tutor || tutor.role !== 'tutor') {
            return res.status(404).json({ message: 'Tutor not found' });
        }
        
        // Soft delete by setting status to 'inactive'
        if (!tutor.tutorInfo) {
            tutor.tutorInfo = {
                subjects: [],
                status: 'inactive',
            };
        } else {
            tutor.tutorInfo.status = 'inactive';
        }
        
        await tutor.save();
        
        console.log(`[denyTutor] Denied tutor: ${tutor.name} (${tutor.email})`);
        
        res.json({ message: 'Tutor application denied successfully' });
    } catch (err) {
        console.error('Error in denyTutor:', err.message);
        res.status(500).json({ message: 'Server error while denying tutor' });
    }
};

/**
 * @desc    Update tutor information (including payroll)
 * @route   PUT /api/tutors/:id
 * @access  Private (Admin)
 */
const updateTutor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Only administrators can update tutors' });
        }
        
        const tutor = await User.findById(req.params.id);
        if (!tutor || tutor.role !== 'tutor') {
            return res.status(404).json({ message: 'Tutor not found' });
        }
        
        const { tutorInfo } = req.body;
        
        if (tutorInfo) {
            if (!tutor.tutorInfo) {
                tutor.tutorInfo = {};
            }
            
            if (tutorInfo.subjects !== undefined) {
                tutor.tutorInfo.subjects = tutorInfo.subjects;
            }
            if (tutorInfo.bio !== undefined) {
                tutor.tutorInfo.bio = tutorInfo.bio;
            }
            if (tutorInfo.status !== undefined) {
                tutor.tutorInfo.status = tutorInfo.status;
            }
            if (tutorInfo.hourlyRate !== undefined) {
                tutor.tutorInfo.hourlyRate = tutorInfo.hourlyRate;
            }
            if (tutorInfo.monthlySalary !== undefined) {
                tutor.tutorInfo.monthlySalary = tutorInfo.monthlySalary;
            }
            if (tutorInfo.hireDate !== undefined) {
                tutor.tutorInfo.hireDate = tutorInfo.hireDate;
            }
            // Payroll fields
            if (tutorInfo.payTier !== undefined) {
                tutor.tutorInfo.payTier = tutorInfo.payTier;
            }
            if (tutorInfo.contractorType !== undefined) {
                tutor.tutorInfo.contractorType = tutorInfo.contractorType;
            }
            if (tutorInfo.taxFormStatus !== undefined) {
                tutor.tutorInfo.taxFormStatus = tutorInfo.taxFormStatus;
            }
            // Handle availability update (admin can set tutor availability)
            if (tutorInfo.availability !== undefined) {
                tutor.tutorInfo.availability = tutorInfo.availability;
            }
            if (tutorInfo.hasCustomAvailability !== undefined) {
                tutor.tutorInfo.hasCustomAvailability = tutorInfo.hasCustomAvailability;
            }
        }
        
        await tutor.save();
        
        console.log(`[updateTutor] Updated tutor: ${tutor.name} (${tutor.email})`);
        
        res.json({
            message: 'Tutor updated successfully',
            tutor: {
                id: tutor._id,
                name: tutor.name,
                email: tutor.email,
                tutorInfo: tutor.tutorInfo
            }
        });
    } catch (err) {
        console.error('Error in updateTutor:', err.message);
        res.status(500).json({ message: 'Server error while updating tutor' });
    }
};

/**
 * @desc    Create a new tutor account (Admin only)
 * @route   POST /api/tutors
 * @access  Private (Admin)
 */
const createTutor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can create tutor accounts' });
        }

        const { name, email, subjects = [], bio = '', hourlyRate = null, monthlySalary = null } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // Check if email already exists
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        // Generate default password (8 characters: 4 random letters + 4 random numbers)
        const generateDefaultPassword = () => {
            const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding confusing letters
            const numbers = '23456789'; // Excluding 0 and 1
            let password = '';
            
            // Add 4 random letters
            for (let i = 0; i < 4; i++) {
                password += letters.charAt(Math.floor(Math.random() * letters.length));
            }
            
            // Add 4 random numbers
            for (let i = 0; i < 4; i++) {
                password += numbers.charAt(Math.floor(Math.random() * numbers.length));
            }
            
            // Shuffle the password
            return password.split('').sort(() => Math.random() - 0.5).join('');
        };

        const defaultPassword = generateDefaultPassword();

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        // Create the tutor user
        const tutor = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'tutor',
            tutorInfo: {
                subjects: Array.isArray(subjects) ? subjects : [],
                bio: bio || '',
                status: 'active', // Created by admin, so immediately active
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
                monthlySalary: monthlySalary ? parseFloat(monthlySalary) : null,
                hireDate: new Date(),
            },
        });

        await tutor.save();

        console.log(`[createTutor] Created tutor account: ${tutor.name} (${tutor.email})`);

        // Send email notification (non-blocking)
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173/login';
        sendTutorAccountEmail(tutor.email, tutor.name, defaultPassword, loginUrl)
            .then(sent => {
                if (sent) {
                    console.log(`[createTutor] Account creation email sent to ${tutor.email}`);
                } else {
                    console.log(`[createTutor] Email not configured - account created but email not sent to ${tutor.email}`);
                }
            })
            .catch(err => {
                console.error(`[createTutor] Error sending email to ${tutor.email}:`, err);
                // Don't fail the request if email fails
            });

        // Return tutor info with the default password (only shown once to admin)
        res.status(201).json({
            message: 'Tutor account created successfully',
            tutor: {
                id: tutor._id,
                name: tutor.name,
                email: tutor.email,
                tutorInfo: tutor.tutorInfo,
            },
            defaultPassword, // Include default password in response (admin needs to share this or email will be sent)
            emailSent: false, // Will be updated if email is configured
        });
    } catch (err) {
        console.error('[createTutor] Error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }
        res.status(500).json({ message: 'Server error while creating tutor account', error: err.message });
    }
};

/**
 * @desc    Get tutor's student roster
 * @route   GET /api/tutors/me/students
 * @access  Private (Tutor)
 */
const getTutorStudents = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can access this endpoint' });
        }

        // Get unique student IDs from bookings
        const studentIds = await Booking.distinct('student', {
            tutor: req.user.id,
            status: { $in: ['scheduled', 'completed'] }
        });

        // Get student details
        const students = await User.find({ 
            _id: { $in: studentIds },
            role: 'student'
        })
            .select('name email avatar role studentProfile');

        // Get booking stats for each student
        const studentsWithStats = await Promise.all(students.map(async (student) => {
            const studentBookings = await Booking.find({
                tutor: req.user.id,
                student: student._id
            });

            const stats = {
                totalSessions: studentBookings.length,
                completedSessions: studentBookings.filter(b => b.status === 'completed').length,
                upcomingSessions: studentBookings.filter(b => b.status === 'scheduled' && new Date(b.sessionDate) > new Date()).length,
                lastSession: studentBookings
                    .filter(b => b.status === 'completed')
                    .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))[0]?.sessionDate || null,
            };

            return {
                ...student.toObject(),
                stats,
            };
        }));

        console.log(`[getTutorStudents] Found ${studentsWithStats.length} students for tutor ${req.user.id}`);
        res.json(studentsWithStats);
    } catch (err) {
        console.error('[getTutorStudents] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching tutor students', error: err.message });
    }
};

/**
 * @desc    Get tutor dashboard stats
 * @route   GET /api/tutors/me/stats
 * @access  Private (Tutor)
 */
const getTutorDashboardStats = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'tutor' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only tutors can access this endpoint' });
        }

        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get all bookings for this tutor
        const allBookings = await Booking.find({ tutor: req.user.id });

        // Calculate stats
        const stats = {
            totalSessions: allBookings.length,
            completedSessions: allBookings.filter(b => b.status === 'completed').length,
            scheduledSessions: allBookings.filter(b => b.status === 'scheduled').length,
            cancelledSessions: allBookings.filter(b => b.status === 'cancelled').length,
            
            // Today's sessions
            todaySessions: allBookings.filter(b => {
                const sessionDate = new Date(b.sessionDate);
                return sessionDate >= startOfToday && b.status === 'scheduled';
            }).length,
            
            // This week's sessions
            weekSessions: allBookings.filter(b => {
                const sessionDate = new Date(b.sessionDate);
                return sessionDate >= startOfWeek && b.status === 'scheduled';
            }).length,
            
            // This month's sessions
            monthSessions: allBookings.filter(b => {
                const sessionDate = new Date(b.sessionDate);
                return sessionDate >= startOfMonth && b.status === 'scheduled';
            }).length,
            
            // Upcoming sessions (next 7 days)
            upcomingSessions: allBookings.filter(b => {
                const sessionDate = new Date(b.sessionDate);
                const sevenDaysFromNow = new Date(now);
                sevenDaysFromNow.setDate(now.getDate() + 7);
                return sessionDate >= now && sessionDate <= sevenDaysFromNow && b.status === 'scheduled';
            }).length,
            
            // Total students
            totalStudents: await Booking.distinct('student', { 
                tutor: req.user.id,
                status: { $in: ['scheduled', 'completed'] }
            }).then(students => students.length),
        };

        console.log(`[getTutorDashboardStats] Stats for tutor ${req.user.id}:`, stats);
        res.json(stats);
    } catch (err) {
        console.error('[getTutorDashboardStats] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching tutor stats', error: err.message });
    }
};

module.exports = {
    getAllTutors,
    getPendingApplications,
    getActiveTutors,
    getTutorStats,
    approveTutor,
    denyTutor,
    updateTutor,
    createTutor,
    getTutorStudents,
    getTutorDashboardStats,
};

