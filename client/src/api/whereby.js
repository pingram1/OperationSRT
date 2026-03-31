import { apiRequest } from './apiService';

/**
 * Creates a Whereby video room for a booking
 * @param {Object} roomData - Room creation data
 * @param {string} roomData.startDate - Session start date/time (ISO string)
 * @param {string} roomData.endDate - Session end date/time (ISO string)
 * @param {string} roomData.bookingId - Optional booking ID
 * @returns {Promise<Object>} Room information with roomId, roomUrl, hostRoomUrl
 */
export const createWherebyRoom = (roomData) => 
  apiRequest('/api/whereby/create-room', {
    method: 'POST',
    body: JSON.stringify(roomData)
  });

/**
 * Gets information about a Whereby room
 * @param {string} roomId - The room ID
 * @returns {Promise<Object>} Room information
 */
export const getWherebyRoom = (roomId) => 
  apiRequest(`/api/whereby/room/${roomId}`, { method: 'GET' });


