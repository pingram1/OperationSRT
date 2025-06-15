const Booking = require('../models/Booking');
const User = require('../models/User');

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res) => {
    const { student, tutor, subject, goals, sessionDate, duration, serviceType } = req.body;

    try {
        // The person making the booking is the logged-in user
        const user = req.user.id; 

        const newBooking = new Booking({
            user,
            student,
            tutor,
            subject,
            goals,
            sessionDate,
            duration,
            serviceType,
            status: 'scheduled',
        });

        const booking = await newBooking.save();
        res.status(201).json(booking);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Get all bookings for the logged-in user
 * @route   GET /api/bookings
 * @access  Private
 */
const getUserBookings = async (req, res) => {
    try {
        // Find bookings where the logged-in user is the one who booked it
        const bookings = await Booking.find({ user: req.user.id })
            .populate('student', 'name avatar') // Populate with student's name and avatar
            .populate('tutor', 'name avatar');  // Populate with tutor's name and avatar

        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Cancel a booking
 * @route   DELETE /api/bookings/:id
 * @access  Private
 */
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure the user trying to cancel is the one who created the booking
        if (booking.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // You might want to update the status instead of removing it completely
        booking.status = 'cancelled';
        await booking.save();
        // Or to remove it: await booking.remove();

        res.json({ message: 'Booking successfully cancelled' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


module.exports = {
    createBooking,
    getUserBookings,
    cancelBooking,
};
