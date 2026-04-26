const express = require('express');
const router = express.Router();

const {
    createSchool,
    getAllSchools,
    getSchoolById,
    getStudentsBySchool,
    rosterUpload,
    getSchoolMetrics,
} = require('../controllers/schoolController');
const { authMiddleware, authorize } = require('../middleware/AuthMiddleware');

const requireAdmin = [authMiddleware, authorize('admin', 'super_admin')];
const requireSchoolAccess = [authMiddleware, authorize('admin', 'super_admin', 'school_admin')];

/**
 * @route   POST /api/schools
 * @desc    Create a school pilot cohort
 * @access  Private (Admin, Super Admin)
 */
router.post('/', requireAdmin, createSchool);

/**
 * @route   GET /api/schools
 * @desc    Get all school pilot cohorts
 * @access  Private (Admin, Super Admin)
 */
router.get('/', requireAdmin, getAllSchools);

/**
 * @route   POST /api/schools/:schoolId/roster-upload
 * @desc    Bulk-create shell student accounts linked to this school
 * @access  Private (Admin, Super Admin)
 */
router.post('/:schoolId/roster-upload', requireAdmin, rosterUpload);

/**
 * @route   GET /api/schools/:schoolId/metrics
 * @desc    Aggregated pilot reporting metrics for a school cohort
 * @access  Private (Admin, Super Admin)
 */
router.get('/:schoolId/metrics', requireAdmin, getSchoolMetrics);

/**
 * @route   GET /api/schools/:id/students
 * @desc    Get students linked to a school pilot cohort
 * @access  Private (Admin, Super Admin, School Admin for own school)
 */
router.get('/:id/students', requireSchoolAccess, getStudentsBySchool);

/**
 * @route   GET /api/schools/:id
 * @desc    Get one school pilot cohort
 * @access  Private (Admin, Super Admin)
 */
router.get('/:id', requireAdmin, getSchoolById);

module.exports = router;
