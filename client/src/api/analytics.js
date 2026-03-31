import { apiRequest } from './apiService';

/**
 * Fetches analytics data for the specified time range.
 * @param {number} timeRange - Number of days to fetch analytics for (7, 30, or 90)
 * @returns {Promise<object>} Analytics data including metrics, charts, and recent activity
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAnalytics = (timeRange = 30) => {
  const endpoint = `/api/analytics?days=${timeRange}`;
  return apiRequest(endpoint, { method: 'GET' });
};

