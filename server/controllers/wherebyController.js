const { createRoom, getRoom } = require('../services/wherebyService');

/**
 * @desc    Create a Whereby video room for a booking
 * @route   POST /api/whereby/create-room
 * @access  Private
 */
const createBookingRoom = async (req, res) => {
    try {
        const { startDate, endDate, bookingId } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ 
                message: 'startDate and endDate are required' 
            });
        }

        // Calculate end date if duration is provided instead
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ 
                message: 'Invalid date format' 
            });
        }

        if (end <= start) {
            return res.status(400).json({ 
                message: 'endDate must be after startDate' 
            });
        }

        const roomInfo = await createRoom({
            startDate: start,
            endDate: end,
            bookingId: bookingId || null,
        });

        res.status(201).json({
            message: 'Room created successfully',
            room: roomInfo,
        });
    } catch (error) {
        console.error('[wherebyController] Error creating room:', error);
        res.status(500).json({ 
            message: 'Failed to create video room' 
        });
    }
};

/**
 * @desc    Get room information
 * @route   GET /api/whereby/room/:roomId
 * @access  Private
 */
const getRoomInfo = async (req, res) => {
    try {
        const { roomId } = req.params;

        if (!roomId) {
            return res.status(400).json({ 
                message: 'roomId is required' 
            });
        }

        const roomInfo = await getRoom(roomId);

        res.json({
            message: 'Room information retrieved',
            room: roomInfo,
        });
    } catch (error) {
        console.error('[wherebyController] Error fetching room:', error);
        res.status(500).json({ 
            message: 'Failed to fetch room information' 
        });
    }
};

module.exports = {
    createBookingRoom,
    getRoomInfo,
};


