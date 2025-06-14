/**
 * This file contains functions for making API calls to your backend's
 * booking-related endpoints. It assumes that the user's authentication token
 * is stored (e.g., in localStorage) and will be sent with each request
 * for protected routes.
 */

/**
 * Creates a new booking.
 * @param {object} bookingData - The data for the new booking. 
 * Expected format: { service, subject, goals, date, time, tutor }
 * @returns {Promise<object>} The newly created booking object from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const createBooking = async (bookingData) => {
    // const token = localStorage.getItem('token'); // In a real app, you'd get the auth token

    const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}` // Send token for protected routes
        },
        body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking.');
    }

    return response.json();
};

/**
 * Fetches all bookings for the currently authenticated user.
 * @returns {Promise<Array>} An array of the user's booking objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getUserBookings = async () => {
    // const token = localStorage.getItem('token');

    const response = await fetch('/api/bookings', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}`
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch bookings.');
    }

    return response.json();
};

/**
 * Cancels a specific booking by its ID.
 * @param {string} bookingId - The ID of the booking to cancel.
 * @returns {Promise<object>} A success message from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const cancelBooking = async (bookingId) => {
    // const token = localStorage.getItem('token');

    const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}`
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking.');
    }

    return response.json();
};
