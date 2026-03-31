import { apiRequest } from './apiService';

/**
 * Fetches notifications for the current user.
 * @param {object} options - Optional { unreadOnly, limit }
 * @returns {Promise<{ notifications: Array, unreadCount: number }>}
 */
export const getNotifications = (options = {}) => {
  const params = new URLSearchParams();
  if (options.unreadOnly) params.append('unreadOnly', 'true');
  if (options.limit) params.append('limit', options.limit);
  const queryString = params.toString();
  const endpoint = `/api/notifications${queryString ? `?${queryString}` : ''}`;
  return apiRequest(endpoint, { method: 'GET' });
};

/**
 * Marks a notification as read.
 * @param {string} notificationId - The notification ID.
 */
export const markNotificationAsRead = (notificationId) =>
  apiRequest(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });

/**
 * Marks all notifications as read.
 */
export const markAllNotificationsAsRead = () =>
  apiRequest('/api/notifications/read-all', {
    method: 'PATCH',
  });
