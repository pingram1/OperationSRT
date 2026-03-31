const { getAvailableTimeSlots, getTutorAvailability, updateTutorAvailability } = require('../utils/availabilityUtils');
const User = require('../models/User');

/**
 * @desc    Get available time slots for a specific date
 * @route   GET /api/availability/slots
 * @access  Private
 */
const getTimeSlots = async (req, res) => {
    try {
        const { date, tutorId, duration, interval } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const selectedDate = new Date(date);
        if (isNaN(selectedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Validate date is not in the past
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (selectedDate < now) {
            return res.status(400).json({ message: 'Cannot book sessions in the past' });
        }

        const sessionDuration = parseInt(duration) || 60;
        const slotInterval = parseInt(interval) || 30;

        // Validate tutor ID if provided
        if (tutorId) {
            const tutor = await User.findById(tutorId);
            if (!tutor || tutor.role !== 'tutor') {
                return res.status(404).json({ message: 'Tutor not found' });
            }
            if (tutor.tutorInfo?.status !== 'active') {
                return res.status(400).json({ message: 'Tutor is not active' });
            }
        }

        const availableSlots = await getAvailableTimeSlots(
            selectedDate,
            tutorId || null,
            sessionDuration,
            slotInterval
        );

        console.log(`[getTimeSlots] Found ${availableSlots.length} available slots for date ${date}${tutorId ? `, tutor ${tutorId}` : ''}`);
        res.json({ availableSlots, date: selectedDate.toISOString() });
    } catch (err) {
        console.error('[getTimeSlots] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching available time slots', error: err.message });
    }
};

/**
 * @desc    Get tutor's availability schedule
 * @route   GET /api/availability/tutor/:tutorId
 * @access  Private
 */
const getTutorAvailabilitySchedule = async (req, res) => {
    try {
        const { tutorId } = req.params;

        const tutor = await User.findById(tutorId);
        if (!tutor || tutor.role !== 'tutor') {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        const availability = await getTutorAvailability(tutorId);

        res.json(availability);
    } catch (err) {
        console.error('[getTutorAvailabilitySchedule] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching tutor availability', error: err.message });
    }
};

/**
 * @desc    Get current user's (tutor) availability schedule
 * @route   GET /api/availability/me
 * @access  Private (Tutor)
 */
const getMyAvailability = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'tutor') {
            return res.status(403).json({ message: 'Only tutors can access this endpoint' });
        }

        const availability = await getTutorAvailability(req.user.id);

        res.json({
            ...availability,
            hasCustomAvailability: user.tutorInfo?.hasCustomAvailability || false,
            customSchedule: user.tutorInfo?.availability || null,
        });
    } catch (err) {
        console.error('[getMyAvailability] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching availability', error: err.message });
    }
};

/**
 * @desc    Update tutor's availability schedule
 * @route   PUT /api/availability/me
 * @access  Private (Tutor)
 */
const updateMyAvailability = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'tutor') {
            return res.status(403).json({ message: 'Only tutors can update their availability' });
        }

        const { weeklySchedule, timezone } = req.body;

        if (!weeklySchedule || !Array.isArray(weeklySchedule)) {
            return res.status(400).json({ message: 'weeklySchedule array is required' });
        }

        // Validate schedule structure
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        for (const daySchedule of weeklySchedule) {
            if (!validDays.includes(daySchedule.day)) {
                return res.status(400).json({ message: `Invalid day: ${daySchedule.day}` });
            }
            if (daySchedule.available && (!daySchedule.startTime || !daySchedule.endTime)) {
                return res.status(400).json({ message: `Start time and end time are required for ${daySchedule.day}` });
            }
        }

        const updatedTutor = await updateTutorAvailability(req.user.id, {
            weeklySchedule,
            timezone: timezone || 'America/New_York',
        });

        console.log(`[updateMyAvailability] Updated availability for tutor ${req.user.id}`);
        res.json({
            message: 'Availability updated successfully',
            availability: updatedTutor.tutorInfo.availability,
            hasCustomAvailability: updatedTutor.tutorInfo.hasCustomAvailability,
        });
    } catch (err) {
        console.error('[updateMyAvailability] Error:', err.message);
        res.status(500).json({ message: 'Server error while updating availability', error: err.message });
    }
};

module.exports = {
    getTimeSlots,
    getTutorAvailabilitySchedule,
    getMyAvailability,
    updateMyAvailability,
};












