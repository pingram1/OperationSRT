import { apiRequest } from './apiService';

/**
 * Fetches system configuration (Admin only).
 * @returns {Promise<object>} System configuration object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getSystemConfig = () => 
  apiRequest('/api/system-config', { method: 'GET' }, true);

/**
 * Updates system configuration (Admin only).
 * @param {object} configData - The configuration data to update.
 * @returns {Promise<object>} The updated configuration object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateSystemConfig = (configData) => 
  apiRequest('/api/system-config', {
    method: 'PUT',
    body: JSON.stringify(configData)
  }, true);

/**
 * Fetches tutor schedule (for tutors to view).
 * @returns {Promise<object>} Tutor schedule object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getTutorSchedule = () => 
  apiRequest('/api/system-config/tutor-schedule', { method: 'GET' }, true);

/**
 * Fetches available subjects (public endpoint, no auth required).
 * @returns {Promise<object>} Object with subjects array.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getSubjects = () => 
  apiRequest('/api/system-config/subjects', { method: 'GET' }, false);
