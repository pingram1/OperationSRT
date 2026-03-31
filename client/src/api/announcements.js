import { apiRequest } from './apiService';

/**
 * Creates a new announcement (Admin only).
 * @param {object} announcementData - The data for the new announcement. 
 * Expected format: { title, message, audience }
 * @returns {Promise<object>} The newly created announcement object from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const createAnnouncement = (announcementData) => 
  apiRequest('/api/announcements', {
    method: 'POST',
    body: JSON.stringify(announcementData)
  });

/**
 * Fetches all announcements (Admin only).
 * @returns {Promise<Array>} An array of all announcement objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAllAnnouncements = () => 
  apiRequest('/api/announcements', { method: 'GET' });

/**
 * Fetches announcements relevant to the current user.
 * Returns empty array on error instead of throwing to prevent authentication issues.
 * @returns {Promise<Array>} An array of announcement objects relevant to the user, or empty array on error.
 */
export const getUserAnnouncements = async () => {
  try {
    return await apiRequest('/api/announcements/user', { method: 'GET' });
  } catch (error) {
    // Don't throw errors for announcements - just return empty array
    // This prevents announcement failures from causing authentication issues
    console.warn('Failed to fetch announcements (non-critical):', error.message);
    return [];
  }
};

/**
 * Deletes an announcement by its ID (Admin only).
 * @param {string} announcementId - The ID of the announcement to delete.
 * @returns {Promise<object>} A success message from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const deleteAnnouncement = (announcementId) => 
  apiRequest(`/api/announcements/${announcementId}`, { method: 'DELETE' });

/**
 * Updates an announcement (Admin only).
 * @param {string} announcementId - The ID of the announcement to update.
 * @param {object} announcementData - The updated announcement data.
 * @returns {Promise<object>} The updated announcement object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateAnnouncement = (announcementId, announcementData) =>
  apiRequest(`/api/announcements/${announcementId}`, {
    method: 'PUT',
    body: JSON.stringify(announcementData),
  });

