import { apiRequest } from './apiService';

/**
 * Fetches all tutors.
 * @returns {Promise<Array>} An array of tutor objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAllTutors = () => 
  apiRequest('/api/tutors', { method: 'GET' });

/**
 * Fetches pending tutor applications.
 * @returns {Promise<Array>} An array of pending tutor applications.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getPendingApplications = () => 
  apiRequest('/api/tutors/pending', { method: 'GET' });

/**
 * Fetches active tutors.
 * @returns {Promise<Array>} An array of active tutor objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getActiveTutors = () => 
  apiRequest('/api/tutors/active', { method: 'GET' });

/**
 * Fetches tutor management statistics.
 * @returns {Promise<object>} An object with stats (pendingApplications, activeTutors, newTutorsLast30Days, totalMonthlyPayroll).
 * @throws {Error} If the API call fails or returns an error.
 */
export const getTutorStats = () => 
  apiRequest('/api/tutors/stats', { method: 'GET' });

/**
 * Approves a tutor application.
 * @param {string} tutorId - The ID of the tutor to approve.
 * @returns {Promise<object>} The updated tutor object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const approveTutor = (tutorId) => 
  apiRequest(`/api/tutors/${tutorId}/approve`, { method: 'PUT' });

/**
 * Denies/rejects a tutor application.
 * @param {string} tutorId - The ID of the tutor to deny.
 * @returns {Promise<object>} A success message.
 * @throws {Error} If the API call fails or returns an error.
 */
export const denyTutor = (tutorId) => 
  apiRequest(`/api/tutors/${tutorId}`, { method: 'DELETE' });

/**
 * Updates tutor information.
 * @param {string} tutorId - The ID of the tutor to update.
 * @param {object} tutorData - The updated tutor data.
 * @returns {Promise<object>} The updated tutor object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateTutor = (tutorId, tutorData) => 
  apiRequest(`/api/tutors/${tutorId}`, {
    method: 'PUT',
    body: JSON.stringify(tutorData),
  });

/**
 * Creates a new tutor account (Admin only).
 * @param {object} tutorData - The tutor data (name, email, subjects, bio, hourlyRate, monthlySalary).
 * @returns {Promise<object>} The created tutor object with default password.
 * @throws {Error} If the API call fails or returns an error.
 */
export const createTutor = (tutorData) => 
  apiRequest('/api/tutors', {
    method: 'POST',
    body: JSON.stringify(tutorData),
  });

/**
 * Gets the tutor's student roster (Tutor only).
 * @returns {Promise<Array>} An array of student objects with stats.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getTutorStudents = () => 
  apiRequest('/api/tutors/me/students', { method: 'GET' });

/**
 * Gets the tutor's dashboard statistics (Tutor only).
 * @returns {Promise<object>} An object with tutor stats.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getTutorDashboardStats = () => 
  apiRequest('/api/tutors/me/stats', { method: 'GET' });

