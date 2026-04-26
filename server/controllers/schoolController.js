const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const School = require('../models/School');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { sendPilotStudentWelcomeEmail } = require('../utils/emailService');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isValidEmail = (value) => typeof value === 'string'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Generate a temporary password that satisfies the User model's strength rules
 * (8+ chars, contains both letters and numbers).
 */
const generateTemporaryPassword = () => {
    const random = crypto.randomBytes(8).toString('hex');
    return `Pilot${random}`;
};

const canAccessSchool = async (req, schoolId) => {
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return true;
    }

    if (req.user.role !== 'school_admin') {
        return false;
    }

    const schoolAdmin = await User.findById(req.user.id).select('schoolId role');
    return Boolean(
        schoolAdmin?.schoolId &&
        schoolAdmin.schoolId.toString() === schoolId.toString()
    );
};

/**
 * @desc    Create a school pilot cohort
 * @route   POST /api/schools
 * @access  Private (Admin, Super Admin)
 */
const createSchool = async (req, res) => {
    try {
        const {
            name,
            district,
            primaryContactName,
            primaryContactEmail,
            status,
            pilotStartDate,
            pilotEndDate,
        } = req.body;

        const school = await School.create({
            name,
            district,
            primaryContactName,
            primaryContactEmail,
            status,
            pilotStartDate,
            pilotEndDate,
        });

        res.status(201).json(school);
    } catch (error) {
        console.error('[createSchool] Error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error while creating school' });
    }
};

/**
 * @desc    Get all school pilot cohorts
 * @route   GET /api/schools
 * @access  Private (Admin, Super Admin)
 */
const getAllSchools = async (req, res) => {
    try {
        const schools = await School.find().sort({ createdAt: -1 });
        res.json(schools);
    } catch (error) {
        console.error('[getAllSchools] Error:', error);
        res.status(500).json({ message: 'Server error while fetching schools' });
    }
};

/**
 * @desc    Get one school pilot cohort
 * @route   GET /api/schools/:id
 * @access  Private (Admin, Super Admin)
 */
const getSchoolById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid school ID' });
        }

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        res.json(school);
    } catch (error) {
        console.error('[getSchoolById] Error:', error);
        res.status(500).json({ message: 'Server error while fetching school' });
    }
};

/**
 * @desc    Get students linked to a school pilot cohort
 * @route   GET /api/schools/:id/students
 * @access  Private (Admin, Super Admin, School Admin for own school)
 */
const getStudentsBySchool = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid school ID' });
        }

        if (!(await canAccessSchool(req, id))) {
            return res.status(403).json({ message: 'Not authorized to access this school cohort' });
        }

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        const students = await User.find({ role: 'student', schoolId: id })
            .select('-password -refreshToken')
            .populate('schoolId', 'name district status')
            .sort({ name: 1 });

        res.json({
            school,
            students,
            count: students.length,
        });
    } catch (error) {
        console.error('[getStudentsBySchool] Error:', error);
        res.status(500).json({ message: 'Server error while fetching school students' });
    }
};

/**
 * @desc    Bulk-upload a roster of students for a school pilot cohort
 * @route   POST /api/schools/:schoolId/roster-upload
 * @access  Private (Admin, Super Admin)
 *
 * Body: { students: [{ name, email }, ...] }
 *
 * For each entry:
 *  - if a user already exists with that email, the entry is skipped
 *    (we never overwrite an existing account or change its school binding here)
 *  - otherwise a "shell" student account is created with a temporary password
 *    and linked to the given school. A welcome email is sent (or logged) so
 *    the student can set their own password.
 */
const rosterUpload = async (req, res) => {
    try {
        const { schoolId } = req.params;
        if (!isValidObjectId(schoolId)) {
            return res.status(400).json({ message: 'Invalid school ID' });
        }

        const school = await School.findById(schoolId);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        const { students } = req.body || {};
        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: 'students must be a non-empty array' });
        }

        const created = [];
        const skipped = [];
        const errors = [];

        for (let index = 0; index < students.length; index += 1) {
            const entry = students[index] || {};
            const rawName = typeof entry.name === 'string' ? entry.name.trim() : '';
            const rawEmail = typeof entry.email === 'string' ? entry.email.trim().toLowerCase() : '';

            if (!rawName || !rawEmail || !isValidEmail(rawEmail)) {
                errors.push({
                    index,
                    email: rawEmail || null,
                    reason: 'Each student must include a name and a valid email',
                });
                continue;
            }

            try {
                const existing = await User.findOne({ email: rawEmail }).select('_id email schoolId');
                if (existing) {
                    skipped.push({
                        index,
                        email: rawEmail,
                        reason: 'User with this email already exists',
                        userId: existing._id,
                    });
                    continue;
                }

                const tempPassword = generateTemporaryPassword();
                const salt = await bcrypt.genSalt(10);
                const hashed = await bcrypt.hash(tempPassword, salt);

                const newUser = await User.create({
                    name: rawName,
                    email: rawEmail,
                    password: hashed,
                    role: 'student',
                    schoolId: school._id,
                });

                let emailSent = false;
                try {
                    emailSent = await sendPilotStudentWelcomeEmail(rawEmail, rawName, {
                        temporaryPassword: tempPassword,
                        schoolName: school.name,
                    });
                } catch (mailErr) {
                    console.error('[rosterUpload] Welcome email failed:', mailErr.message);
                }

                console.log(`[rosterUpload] Created shell student for school ${school._id}: ${rawEmail} (emailSent=${emailSent})`);

                created.push({
                    index,
                    userId: newUser._id,
                    email: newUser.email,
                    welcomeEmailSent: emailSent,
                });
            } catch (perStudentError) {
                console.error('[rosterUpload] Error processing entry:', perStudentError);
                errors.push({
                    index,
                    email: rawEmail,
                    reason: perStudentError.code === 11000
                        ? 'Email already in use'
                        : (perStudentError.message || 'Unknown error'),
                });
            }
        }

        return res.status(201).json({
            schoolId: school._id,
            counts: {
                received: students.length,
                created: created.length,
                skipped: skipped.length,
                errors: errors.length,
            },
            created,
            skipped,
            errors,
        });
    } catch (error) {
        console.error('[rosterUpload] Error:', error);
        return res.status(500).json({ message: 'Server error while uploading roster' });
    }
};

/**
 * @desc    Compute aggregated pilot metrics for a school cohort.
 * @route   GET /api/schools/:schoolId/metrics
 * @access  Private (Admin, Super Admin; school_admin for own cohort)
 *
 * Strategy:
 *   1. Resolve all student userIds with this schoolId (role: student).
 *   2. Run a single Booking $facet aggregation scoped by `student in [...]`:
 *        - completedCount    : status === 'completed'
 *        - upcomingCount     : status === 'scheduled'
 *        - subjects          : grouped by `subject`, excluding cancelled/no_show
 *      so the pilot's reported subjects reflect the work that was actually
 *      delivered or is still on the books.
 *   3. Shape the response so the client can render either the map
 *      (`subjectDistribution`) or the pre-ranked list (`subjectsRanked`).
 */
const getSchoolMetrics = async (req, res) => {
    try {
        const { schoolId } = req.params;
        if (!isValidObjectId(schoolId)) {
            return res.status(400).json({ message: 'Invalid school ID' });
        }

        if (!(await canAccessSchool(req, schoolId))) {
            return res.status(403).json({ message: 'Not authorized to access this school cohort' });
        }

        const school = await School.findById(schoolId);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        const studentDocs = await User.find({ schoolId, role: 'student' })
            .select('_id')
            .lean();
        const studentIds = studentDocs.map((doc) => doc._id);
        const totalActiveStudents = studentIds.length;

        if (totalActiveStudents === 0) {
            return res.json({
                schoolId,
                schoolName: school.name,
                totalActiveStudents: 0,
                totalSessionsCompleted: 0,
                totalUpcomingSessions: 0,
                subjectDistribution: {},
                subjectsRanked: [],
                generatedAt: new Date().toISOString(),
            });
        }

        const facetResults = await Booking.aggregate([
            { $match: { student: { $in: studentIds } } },
            {
                $facet: {
                    completedCount: [
                        { $match: { status: 'completed' } },
                        { $count: 'count' },
                    ],
                    upcomingCount: [
                        { $match: { status: 'scheduled' } },
                        { $count: 'count' },
                    ],
                    subjects: [
                        { $match: { status: { $nin: ['cancelled', 'no_show'] } } },
                        {
                            $group: {
                                _id: { $ifNull: ['$subject', 'Unspecified'] },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { count: -1, _id: 1 } },
                    ],
                },
            },
        ]);

        const result = facetResults[0] || {};
        const totalSessionsCompleted = result.completedCount?.[0]?.count || 0;
        const totalUpcomingSessions = result.upcomingCount?.[0]?.count || 0;

        const subjectsRanked = (result.subjects || []).map((row) => ({
            subject: row._id || 'Unspecified',
            count: row.count,
        }));
        const subjectDistribution = subjectsRanked.reduce((acc, row) => {
            acc[row.subject] = row.count;
            return acc;
        }, {});

        return res.json({
            schoolId,
            schoolName: school.name,
            totalActiveStudents,
            totalSessionsCompleted,
            totalUpcomingSessions,
            subjectDistribution,
            subjectsRanked,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[getSchoolMetrics] Error:', error);
        return res.status(500).json({ message: 'Server error while computing school metrics' });
    }
};

module.exports = {
    createSchool,
    getAllSchools,
    getSchoolById,
    getStudentsBySchool,
    rosterUpload,
    getSchoolMetrics,
};
