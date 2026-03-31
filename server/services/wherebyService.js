const axios = require('axios');

const WHEREBY_API_BASE = 'https://api.whereby.dev/v1';

/**
 * Create a Whereby video room for a booking session
 * @param {Object} options - Room creation options
 * @param {Date} options.startDate - Session start date/time
 * @param {Date} options.endDate - Session end date/time
 * @param {string} options.roomNamePrefix - Prefix for room name (optional)
 * @param {string} options.bookingId - Booking ID for reference
 * @returns {Promise<Object>} Room information with meetingId, roomUrl, hostRoomUrl
 */
const createRoom = async ({ startDate, endDate, roomNamePrefix = 'session', bookingId = null }) => {
    try {
        const apiKey = process.env.WHEREBY_API;
        
        if (!apiKey) {
            throw new Error('WHEREBY_API key is not configured');
        }

        // Format dates in ISO 8601 format
        const startDateISO = new Date(startDate).toISOString();
        const endDateISO = new Date(endDate).toISOString();

        // Request body according to Whereby API documentation
        const requestBody = {
            endDate: endDateISO,
            fields: ['hostRoomUrl', 'roomUrl', 'meetingId', 'startDate', 'endDate'],
        };

        // Add startDate if provided (optional according to API)
        if (startDateISO) {
            requestBody.startDate = startDateISO;
        }

        console.log('[wherebyService] Creating room with:', requestBody);

        const response = await axios.post(
            `${WHEREBY_API_BASE}/meetings`,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const roomData = response.data;
        
        console.log('[wherebyService] Room created successfully:', {
            meetingId: roomData.meetingId,
            roomUrl: roomData.roomUrl,
            hasHostUrl: !!roomData.hostRoomUrl
        });

        return {
            meetingId: roomData.meetingId,
            roomId: roomData.meetingId, // For backward compatibility
            roomUrl: roomData.roomUrl,
            hostRoomUrl: roomData.hostRoomUrl,
            startDate: roomData.startDate,
            endDate: roomData.endDate,
            createdAt: new Date(),
        };
    } catch (error) {
        console.error('[wherebyService] Error creating room:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        throw new Error(`Failed to create Whereby room: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * Get room information
 * @param {string} meetingId - Whereby meeting ID
 * @returns {Promise<Object>} Room information
 */
const getRoom = async (meetingId) => {
    try {
        const apiKey = process.env.WHEREBY_API;
        
        if (!apiKey) {
            throw new Error('WHEREBY_API key is not configured');
        }

        const response = await axios.get(
            `${WHEREBY_API_BASE}/meetings/${meetingId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('[wherebyService] Error fetching room:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        throw new Error(`Failed to fetch Whereby room: ${error.response?.data?.message || error.message}`);
    }
};

module.exports = {
    createRoom,
    getRoom,
};


