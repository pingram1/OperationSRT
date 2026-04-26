import { apiRequest } from './apiService';

/**
 * Create a new school pilot cohort. (Admin / Super Admin)
 * @param {object} schoolData - { name, district, primaryContactName, primaryContactEmail, status, pilotStartDate, pilotEndDate }
 */
export const createSchool = (schoolData) =>
    apiRequest('/api/schools', {
        method: 'POST',
        body: JSON.stringify(schoolData || {}),
    });

/**
 * Fetch all school pilot cohorts. (Admin / Super Admin)
 */
export const getAllSchools = () =>
    apiRequest('/api/schools', { method: 'GET' });

/**
 * Fetch a single school cohort by ID. (Admin / Super Admin)
 * @param {string} schoolId
 */
export const getSchoolById = (schoolId) => {
    if (!schoolId) {
        throw new Error('schoolId is required');
    }
    return apiRequest(`/api/schools/${schoolId}`, { method: 'GET' });
};

/**
 * Fetch students linked to a school cohort.
 * Accessible to Admin/Super Admin and (in the future) to a school_admin for their own cohort.
 * @param {string} schoolId
 */
export const getStudentsBySchool = (schoolId) => {
    if (!schoolId) {
        throw new Error('schoolId is required');
    }
    return apiRequest(`/api/schools/${schoolId}/students`, { method: 'GET' });
};

/**
 * Fetch aggregated pilot reporting metrics for a school cohort.
 * Returns: { totalActiveStudents, totalSessionsCompleted, totalUpcomingSessions,
 *           subjectDistribution, subjectsRanked }
 * @param {string} schoolId
 */
export const getSchoolMetrics = (schoolId) => {
    if (!schoolId) {
        throw new Error('schoolId is required');
    }
    return apiRequest(`/api/schools/${schoolId}/metrics`, { method: 'GET' });
};

/**
 * Bulk-upload a roster of students to a school. (Admin / Super Admin)
 * @param {string} schoolId
 * @param {Array<{ name: string, email: string }>} students
 * @returns {Promise<{ schoolId: string, counts: object, created: any[], skipped: any[], errors: any[] }>}
 */
export const rosterUpload = (schoolId, students) => {
    if (!schoolId) {
        throw new Error('schoolId is required');
    }
    if (!Array.isArray(students)) {
        throw new Error('students must be an array');
    }
    return apiRequest(`/api/schools/${schoolId}/roster-upload`, {
        method: 'POST',
        body: JSON.stringify({ students }),
    });
};
