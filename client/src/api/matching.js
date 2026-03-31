import { apiRequest } from './apiService';

/**
 * Find tutor matches for a student
 * @param {string} studentId - Optional student ID (defaults to current user)
 * @param {string} subject - Optional subject filter
 * @param {number} limit - Maximum number of matches to return
 * @returns {Promise<Array>} Array of tutor matches with compatibility scores
 */
export const findTutorMatches = async (studentId = null, subject = null, limit = 3) => {
  return apiRequest('/api/matching/find-tutors', {
    method: 'POST',
    body: JSON.stringify({ studentId, subject, limit })
  });
};

/**
 * Get detailed compatibility analysis between tutor and student
 * @param {string} tutorId - Tutor ID
 * @param {string} studentId - Student ID (optional, defaults to current user)
 * @returns {Promise<Object>} Compatibility analysis
 */
export const getCompatibilityAnalysis = async (tutorId, studentId = null) => {
  const endpoint = studentId 
    ? `/api/matching/compatibility/${tutorId}/${studentId}`
    : `/api/matching/compatibility/${tutorId}/${tutorId}`; // Will be handled by backend
  return apiRequest(endpoint, { method: 'GET' });
};

/**
 * Record match feedback for continuous improvement
 * @param {Object} feedbackData - Feedback data
 * @returns {Promise<Object>} Success response
 */
export const recordMatchFeedback = async (feedbackData) => {
  return apiRequest('/api/matching/feedback', {
    method: 'POST',
    body: JSON.stringify(feedbackData)
  });
};

/**
 * Get matching analytics (admin only)
 * @returns {Promise<Object>} Analytics data
 */
export const getMatchingAnalytics = async () => {
  return apiRequest('/api/matching/analytics', { method: 'GET' });
};





