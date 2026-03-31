import { apiRequest } from './apiService';

/**
 * Get all achievements (Admin only)
 * @returns {Promise<Array>} An array of all achievements
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAllAchievements = () =>
  apiRequest('/api/achievements/all', {
    method: 'GET',
  });

/**
 * Get all achievements for a specific student
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} Object containing achievements, grouped achievements, and total count
 * @throws {Error} If the API call fails or returns an error.
 */
export const getStudentAchievements = (studentId) =>
  apiRequest(`/api/achievements/student/${studentId}`, {
    method: 'GET',
  });

/**
 * Check and award achievements for a student
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} Object containing awarded achievements
 * @throws {Error} If the API call fails or returns an error.
 */
export const checkAndAwardAchievements = (studentId) =>
  apiRequest(`/api/achievements/check/${studentId}`, {
    method: 'POST',
  });







