const express = require('express');
const router = express.Router();

const {
    createSchool,
    getAllSchools,
    getSchoolById,
    getStudentsBySchool,
    rosterUpload,
    getSchoolMetrics,
    getCohortLeaderboards,
    getSchoolLeaderboard,
} = require('../controllers/schoolController');
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');
const { tenantScope } = require('../middleware/tenantScope');
const { validateRequest } = require('../middleware/validate');
const schoolValidators = require('../middleware/validators/schools');

// tenantScope runs after auth: it resolves req.tenant (global for admins,
// pinned-to-school for school_admins) and blocks a school_admin with no school
// binding before any controller logic runs.
const requireAdmin = [authMiddleware, authorize('admin', 'super_admin'), tenantScope];
const requireSchoolAccess = [authMiddleware, authorize('admin', 'super_admin', 'school_admin'), tenantScope];
// A student/school_admin may view a cohort leaderboard; the controller enforces
// object-level access (own cohort only) so this stays role-broad but data-scoped.
const requireCohortViewer = [authMiddleware, authorize('student', 'school_admin', 'admin', 'super_admin'), tenantScope];

/**
 * @route   POST /api/schools
 * @desc    Create a school pilot cohort
 * @access  Private (Admin, Super Admin)
 */
router.post('/', requireAdmin, schoolValidators.create, validateRequest, createSchool);

/**
 * @route   GET /api/schools
 * @desc    Get all school pilot cohorts
 * @access  Private (Admin, Super Admin)
 */
router.get('/', requireAdmin, getAllSchools);

/**
 * @route   GET /api/schools/leaderboards/cohorts
 * @desc    Cohort-vs-cohort global ranking (schools ranked by summed student XP)
 * @access  Private (Admin, Super Admin, School Admin)
 *
 * NOTE: registered BEFORE the `/:id`-style param routes so the literal
 * "leaderboards" segment is never captured as a school id.
 */
router.get('/leaderboards/cohorts', requireSchoolAccess, getCohortLeaderboards);

/**
 * @route   POST /api/schools/:schoolId/roster-upload
 * @desc    Bulk-create shell student accounts linked to this school
 * @access  Private (Admin, Super Admin; School Admin for own cohort — enforced
 *          object-level by canAccessSchool in the controller)
 */
router.post('/:schoolId/roster-upload', requireSchoolAccess, schoolValidators.rosterUpload, validateRequest, rosterUpload);

/**
 * @route   GET /api/schools/:schoolId/metrics
 * @desc    Aggregated pilot reporting metrics for a school cohort
 * @access  Private (Admin, Super Admin; School Admin for own cohort — enforced
 *          object-level by canAccessSchool in the controller)
 */
router.get('/:schoolId/metrics', requireSchoolAccess, schoolValidators.schoolIdParam, validateRequest, getSchoolMetrics);

/**
 * @route   GET /api/schools/:schoolId/leaderboard
 * @desc    Internal student ranking within a single cohort
 * @access  Private (Student for own cohort, School Admin for own cohort, Admins)
 */
router.get('/:schoolId/leaderboard', requireCohortViewer, schoolValidators.schoolIdParam, validateRequest, getSchoolLeaderboard);

/**
 * @route   GET /api/schools/:id/students
 * @desc    Get students linked to a school pilot cohort
 * @access  Private (Admin, Super Admin, School Admin for own school)
 */
router.get('/:id/students', requireSchoolAccess, schoolValidators.idParam, validateRequest, getStudentsBySchool);

/**
 * @route   GET /api/schools/:id
 * @desc    Get one school pilot cohort
 * @access  Private (Admin, Super Admin; School Admin for own school — enforced
 *          object-level by canAccessSchool in the controller)
 */
router.get('/:id', requireSchoolAccess, schoolValidators.idParam, validateRequest, getSchoolById);

module.exports = router;
