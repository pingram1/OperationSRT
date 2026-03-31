const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');
const Booking = require('../models/Booking');

/**
 * Convert time string (HH:MM) to minutes since midnight
 * @param {string} timeStr - Time in "HH:MM" format (24-hour)
 * @returns {number} Minutes since midnight
 */
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string (HH:MM AM/PM)
 * @param {number} minutes - Minutes since midnight
 * @param {boolean} format12Hour - If true, format as 12-hour with AM/PM
 * @returns {string} Formatted time string
 */
const minutesToTime = (minutes, format12Hour = true) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (format12Hour) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
    } else {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
};

/**
 * Get day name from Date object
 * @param {Date} date - Date object
 * @returns {string} Day name (Monday, Tuesday, etc.)
 */
const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
};

/**
 * Generate time slots between start and end time
 * @param {number} startMinutes - Start time in minutes since midnight
 * @param {number} endMinutes - End time in minutes since midnight
 * @param {number} slotDuration - Duration of each slot in minutes (default: 30)
 * @returns {Array<number>} Array of minutes since midnight for each slot
 */
const generateTimeSlots = (startMinutes, endMinutes, slotDuration = 30) => {
    const slots = [];
    for (let time = startMinutes; time < endMinutes; time += slotDuration) {
        slots.push(time);
    }
    return slots;
};

/**
 * Get tutor's availability schedule (either custom or system default)
 * @param {string} tutorId - Tutor's user ID (optional)
 * @returns {Promise<Object>} Availability schedule object
 */
const getTutorAvailability = async (tutorId = null) => {
    // Get system default schedule
    const systemConfig = await SystemConfig.getConfig();
    let schedule = systemConfig.tutorSchedule?.weeklySchedule || [];
    let timezone = systemConfig.tutorSchedule?.timezone || 'America/New_York';

    // If tutor ID is provided, check if tutor has custom availability
    if (tutorId) {
        const tutor = await User.findById(tutorId);
        if (tutor && tutor.role === 'tutor' && tutor.tutorInfo?.hasCustomAvailability && tutor.tutorInfo?.availability?.weeklySchedule) {
            schedule = tutor.tutorInfo.availability.weeklySchedule;
            timezone = tutor.tutorInfo.availability.timezone || timezone;
        }
    }

    return { schedule, timezone };
};

/**
 * Get existing bookings for a specific date and tutor
 * @param {Date} date - Date to check
 * @param {string} tutorId - Tutor ID (optional)
 * @returns {Promise<Array>} Array of existing bookings
 */
const getExistingBookings = async (date, tutorId = null) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
        sessionDate: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
        status: { $in: ['scheduled', 'completed'] }, // Only count scheduled/completed sessions
    };

    if (tutorId) {
        query.tutor = tutorId;
    }

    const bookings = await Booking.find(query)
        .select('sessionDate duration')
        .sort({ sessionDate: 1 });

    return bookings;
};

/**
 * Check if a time slot conflicts with existing bookings
 * @param {number} slotMinutes - Time slot in minutes since midnight
 * @param {number} slotDuration - Duration of the slot in minutes
 * @param {Array} existingBookings - Array of existing bookings
 * @param {Date} date - Date of the booking
 * @returns {boolean} True if there's a conflict
 */
const hasConflict = (slotMinutes, slotDuration, existingBookings, date) => {
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

    return existingBookings.some(booking => {
        const bookingStart = new Date(booking.sessionDate);
        const bookingEnd = new Date(bookingStart);
        bookingEnd.setMinutes(bookingEnd.getMinutes() + (booking.duration || 60));

        // Check for overlap
        return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
};

/**
 * Get available time slots for a specific date
 * @param {Date} date - Date to get slots for
 * @param {string} tutorId - Tutor ID (optional, if provided, uses tutor's availability)
 * @param {number} sessionDuration - Duration of the session in minutes (default: 60)
 * @param {number} slotInterval - Interval between slots in minutes (default: 30)
 * @returns {Promise<Array<string>>} Array of available time strings (e.g., "09:00 AM")
 */
const getAvailableTimeSlots = async (date, tutorId = null, sessionDuration = 60, slotInterval = 30) => {
    try {
        // Get availability schedule (tutor-specific or system default)
        const { schedule, timezone } = await getTutorAvailability(tutorId);

        // Get day name
        const dayName = getDayName(date);

        // Find schedule for this day
        const daySchedule = schedule.find(s => s.day === dayName);

        // If day is not available, return empty array
        if (!daySchedule || !daySchedule.available) {
            return [];
        }

        // Convert start/end times to minutes
        const startMinutes = timeToMinutes(daySchedule.startTime);
        const endMinutes = timeToMinutes(daySchedule.endTime);

        // Generate all possible time slots
        const allSlots = generateTimeSlots(startMinutes, endMinutes, slotInterval);

        // Get existing bookings for this date
        const existingBookings = await getExistingBookings(date, tutorId);

        // Filter out slots that conflict with existing bookings
        const availableSlots = allSlots.filter(slotMinutes => {
            // Check if slot + duration fits within the day's availability
            if (slotMinutes + sessionDuration > endMinutes) {
                return false;
            }

            // Check for conflicts with existing bookings
            return !hasConflict(slotMinutes, sessionDuration, existingBookings, date);
        });

        // Convert to formatted time strings
        return availableSlots.map(minutes => minutesToTime(minutes, true));
    } catch (error) {
        console.error('[getAvailableTimeSlots] Error:', error);
        return [];
    }
};

/**
 * Update tutor's availability
 * @param {string} tutorId - Tutor's user ID
 * @param {Object} availability - Availability object with weeklySchedule and timezone
 * @returns {Promise<Object>} Updated tutor object
 */
const updateTutorAvailability = async (tutorId, availability) => {
    const tutor = await User.findById(tutorId);
    if (!tutor || tutor.role !== 'tutor') {
        throw new Error('Tutor not found');
    }

    if (!tutor.tutorInfo) {
        tutor.tutorInfo = {};
    }

    tutor.tutorInfo.availability = {
        weeklySchedule: availability.weeklySchedule || [],
        timezone: availability.timezone || 'America/New_York',
    };
    tutor.tutorInfo.hasCustomAvailability = true;

    await tutor.save();
    return tutor;
};

module.exports = {
    getAvailableTimeSlots,
    getTutorAvailability,
    updateTutorAvailability,
    timeToMinutes,
    minutesToTime,
    getDayName,
};












