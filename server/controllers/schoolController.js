const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const School = require('../models/School');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { sendPilotStudentWelcomeEmail } = require('../utils/emailService');
const { trackEvent } = require('../services/telemetryService');

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
            sector,
            status,
            pilotStartDate,
            pilotEndDate,
        } = req.body;

        const school = await School.create({
            name,
            district,
            primaryContactName,
            primaryContactEmail,
            sector: sector || null,
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
        // Global admins see every cohort; a school_admin only ever sees their own.
        const filter = {};
        if (req.user.role === 'school_admin') {
            const schoolAdmin = await User.findById(req.user.id).select('schoolId').lean();
            if (!schoolAdmin?.schoolId) {
                return res.json([]);
            }
            filter._id = schoolAdmin.schoolId;
        }
        const schools = await School.find(filter).sort({ createdAt: -1 });
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

        if (!(await canAccessSchool(req, id))) {
            return res.status(403).json({ message: 'Not authorized to access this school cohort' });
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

        if (!(await canAccessSchool(req, schoolId))) {
            return res.status(403).json({ message: 'Not authorized to upload a roster for this school cohort' });
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
                    sector: school.sector || null,
                });

                trackEvent(
                    'cohort_student_school_linked',
                    { linkReason: 'roster_bulk' },
                    {
                        actorUserId: req.user.id,
                        subjectStudentId: newUser._id,
                        schoolId: school._id,
                    },
                ).catch(() => {});

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

        trackEvent(
            'cohort_roster_bulk_import_finished',
            {
                requestedRowCount: students.length,
                createdUserCount: created.length,
                skippedExistingCount: skipped.length,
                errorRowCount: errors.length,
            },
            {
                actorUserId: req.user.id,
                schoolId: school._id,
            },
        ).catch(() => {});

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

/**
 * @desc    Cohort-vs-cohort global leaderboard.
 *          Groups all linked students by schoolId, sums their XP, and ranks
 *          schools in descending order of total cohort XP.
 * @route   GET /api/schools/leaderboards/cohorts
 * @access  Private (Admin, Super Admin, School Admin)
 *
 * Query params:
 *   limit  - optional cap on the number of cohorts returned (default 50)
 */
const getCohortLeaderboards = async (req, res) => {
    try {
        const parsedLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

        const rows = await User.aggregate([
            { $match: { role: 'student', schoolId: { $ne: null } } },
            {
                $group: {
                    _id: '$schoolId',
                    cohortTotalXp: { $sum: '$xp' },
                    studentCount: { $sum: 1 },
                    averageXp: { $avg: '$xp' },
                },
            },
            { $sort: { cohortTotalXp: -1, _id: 1 } },
            { $limit: parsedLimit },
            {
                $lookup: {
                    from: 'schools',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'school',
                },
            },
            { $unwind: '$school' },
            {
                $project: {
                    _id: 0,
                    schoolId: '$_id',
                    schoolName: '$school.name',
                    district: '$school.district',
                    sector: '$school.sector',
                    cohortTotalXp: 1,
                    studentCount: 1,
                    averageXp: { $round: ['$averageXp', 1] },
                },
            },
        ]);

        // Attach a 1-based rank reflecting the descending XP sort.
        const cohorts = rows.map((row, index) => ({ rank: index + 1, ...row }));

        return res.json({
            count: cohorts.length,
            generatedAt: new Date().toISOString(),
            cohorts,
        });
    } catch (error) {
        console.error('[getCohortLeaderboards] Error:', error);
        return res.status(500).json({ message: 'Server error while building cohort leaderboard' });
    }
};

/**
 * @desc    Internal student ranking within a single cohort.
 * @route   GET /api/schools/:schoolId/leaderboard
 * @access  Private (Student for own cohort, School Admin for own cohort, Admins)
 *
 * Authorization:
 *   - admin / super_admin : any cohort
 *   - school_admin        : their own cohort (canAccessSchool)
 *   - student             : their own cohort only (schoolId must match)
 */
const getSchoolLeaderboard = async (req, res) => {
    try {
        const { schoolId } = req.params;
        if (!isValidObjectId(schoolId)) {
            return res.status(400).json({ message: 'Invalid school ID' });
        }

        const role = req.user.role;
        let authorized = false;

        if (role === 'student') {
            // A student may only ever read their OWN cohort's board.
            authorized = Boolean(
                req.user.schoolId &&
                req.user.schoolId.toString() === schoolId.toString()
            );
        } else {
            // admin / super_admin / school_admin handled by canAccessSchool.
            authorized = await canAccessSchool(req, schoolId);
        }

        if (!authorized) {
            return res.status(403).json({ message: 'Not authorized to view this cohort leaderboard' });
        }

        const school = await School.findById(schoolId).select('name district sector status');
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        const parsedLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

        const students = await User.find({ role: 'student', schoolId })
            .select('name avatar xp level')
            .sort({ xp: -1, name: 1 })
            .limit(parsedLimit)
            .lean();

        const leaderboard = students.map((student, index) => ({
            rank: index + 1,
            ...student,
        }));

        const cohortTotalXp = leaderboard.reduce((sum, s) => sum + (s.xp || 0), 0);

        return res.json({
            schoolId,
            schoolName: school.name,
            district: school.district,
            sector: school.sector,
            studentCount: leaderboard.length,
            cohortTotalXp,
            generatedAt: new Date().toISOString(),
            leaderboard,
        });
    } catch (error) {
        console.error('[getSchoolLeaderboard] Error:', error);
        return res.status(500).json({ message: 'Server error while building school leaderboard' });
    }
};

module.exports = {
    createSchool,
    getAllSchools,
    getSchoolById,
    getStudentsBySchool,
    rosterUpload,
    getSchoolMetrics,
    getCohortLeaderboards,
    getSchoolLeaderboard,
};
