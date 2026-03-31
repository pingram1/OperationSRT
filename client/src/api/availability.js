import { apiRequest } from './apiService';

/**
 * Gets available time slots for a specific date.
 * @param {Date|string} date - The date to get slots for.
 * @param {string} tutorId - Optional tutor ID to filter by tutor availability.
 * @param {number} duration - Session duration in minutes (default: 60).
 * @param {number} interval - Interval between slots in minutes (default: 30).
 * @returns {Promise<Array<string>>} Array of available time strings (e.g., "09:00 AM").
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAvailableTimeSlots = (date, tutorId = null, duration = 60, interval = 30) => {
  const dateStr = date instanceof Date ? date.toISOString() : date;
  const params = new URLSearchParams();
  params.append('date', dateStr);
  if (tutorId) params.append('tutorId', tutorId);
  if (duration) params.append('duration', duration.toString());
  if (interval) params.append('interval', interval.toString());
  
  const endpoint = `/api/availability/slots?${params.toString()}`;
  return apiRequest(endpoint, { method: 'GET' }).then(data => data.availableSlots || []);
};

/**
 * Gets a tutor's availability schedule.
 * @param {string} tutorId - The tutor's user ID.
 * @returns {Promise<object>} The tutor's availability schedule.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getTutorAvailabilitySchedule = (tutorId) =>
  apiRequest(`/api/availability/tutor/${tutorId}`, { method: 'GET' });

/**
 * Gets the current tutor's availability schedule.
 * @returns {Promise<object>} The tutor's availability schedule.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getMyAvailability = () =>
  apiRequest('/api/availability/me', { method: 'GET' });

/**
 * Updates the current tutor's availability schedule.
 * @param {object} availability - Availability object with weeklySchedule and timezone.
 * @returns {Promise<object>} The updated availability.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateMyAvailability = (availability) =>
  apiRequest('/api/availability/me', {
    method: 'PUT',
    body: JSON.stringify(availability),
  });












