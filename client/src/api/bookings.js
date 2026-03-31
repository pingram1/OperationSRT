import { apiRequest } from './apiService';

/**
 * Creates a new booking.
 * @param {object} bookingData - The data for the new booking. 
 * Expected format: { student, tutor, subject, goals, sessionDate, duration, serviceType }
 * @returns {Promise<object>} The newly created booking object from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const createBooking = (bookingData) => 
  apiRequest('/api/bookings', {
        method: 'POST',
    body: JSON.stringify(bookingData)
    });

/**
 * Fetches all bookings for the currently authenticated user.
 * @returns {Promise<Array>} An array of the user's booking objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getUserBookings = () => 
  apiRequest('/api/bookings', { method: 'GET' });

/**
 * Cancels a specific booking by its ID.
 * @param {string} bookingId - The ID of the booking to cancel.
 * @param {string} reason - Optional cancellation reason.
 * @returns {Promise<object>} A success message from the server with penalty information.
 * @throws {Error} If the API call fails or returns an error.
 */
export const cancelBooking = (bookingId, reason = null) => 
  apiRequest(`/api/bookings/${bookingId}`, { 
    method: 'DELETE',
    body: reason ? JSON.stringify({ reason }) : undefined
  });

/**
 * Fetches all bookings (Admin only).
 * @param {object} filters - Optional filters (status, student, tutor, subject, startDate, endDate)
 * @returns {Promise<Array>} An array of all booking objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAllBookings = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.student) params.append('student', filters.student);
  if (filters.tutor) params.append('tutor', filters.tutor);
  if (filters.subject) params.append('subject', filters.subject);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
  
  const queryString = params.toString();
  const endpoint = `/api/bookings/all${queryString ? `?${queryString}` : ''}`;
  return apiRequest(endpoint, { method: 'GET' });
};

/**
 * Updates a booking (Admin only).
 * @param {string} bookingId - The ID of the booking to update.
 * @param {object} bookingData - The updated booking data.
 * @returns {Promise<object>} The updated booking object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateBooking = (bookingId, bookingData) =>
  apiRequest(`/api/bookings/${bookingId}`, {
    method: 'PUT',
    body: JSON.stringify(bookingData),
  });

/**
 * Deletes a booking permanently (Admin only).
 * @param {string} bookingId - The ID of the booking to delete.
 * @returns {Promise<object>} A success message from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const deleteBooking = (bookingId) =>
  apiRequest(`/api/bookings/${bookingId}/delete`, { method: 'DELETE' });

/**
 * Fetches all bookings for a tutor.
 * @param {object} filters - Optional filters (status, startDate, endDate)
 * @returns {Promise<Array>} An array of booking objects for the tutor.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getTutorBookings = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  
  const queryString = params.toString();
  const endpoint = `/api/bookings/tutor${queryString ? `?${queryString}` : ''}`;
  return apiRequest(endpoint, { method: 'GET' });
};

/**
 * Accepts a booking (Tutor only).
 * @param {string} bookingId - The ID of the booking to accept.
 * @returns {Promise<object>} The updated booking object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const acceptBooking = (bookingId) =>
  apiRequest(`/api/bookings/${bookingId}/accept`, {
    method: 'PUT',
  });

/**
 * Declines a booking (Tutor only).
 * @param {string} bookingId - The ID of the booking to decline.
 * @returns {Promise<object>} The updated booking object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const declineBooking = (bookingId) =>
  apiRequest(`/api/bookings/${bookingId}/decline`, {
    method: 'PUT',
  });

/**
 * Marks a booking as complete (Tutor only).
 * @param {string} bookingId - The ID of the booking to mark as complete.
 * @returns {Promise<object>} The updated booking object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const completeBooking = (bookingId) =>
  apiRequest(`/api/bookings/${bookingId}/complete`, {
    method: 'PUT',
  });

/**
 * Marks a booking as no-show (Admin only).
 * @param {string} bookingId - The ID of the booking to mark as no-show.
 * @returns {Promise<object>} The updated booking object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const markBookingAsNoShow = (bookingId) =>
  apiRequest(`/api/bookings/${bookingId}/mark-no-show`, {
    method: 'PUT',
  });

/**
 * Marks a booking as paid (Admin only).
 * @param {string} bookingId - The ID of the booking to mark as paid.
 * @returns {Promise<object>} The updated booking object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const markBookingAsPaid = (bookingId) =>
  apiRequest(`/api/bookings/${bookingId}/mark-paid`, {
    method: 'PUT',
  });

/**
 * Marks multiple bookings as paid (Admin only).
 * @param {Array<string>} bookingIds - Array of booking IDs to mark as paid.
 * @returns {Promise<object>} Success message with count.
 * @throws {Error} If the API call fails or returns an error.
 */
export const markBookingsAsPaidBatch = (bookingIds) =>
  apiRequest('/api/bookings/mark-paid-batch', {
    method: 'PUT',
    body: JSON.stringify({ bookingIds }),
  });

/**
 * Updates session notes for a booking (Tutor only).
 * @param {string} bookingId - The ID of the booking.
 * @param {object} notesData - The session notes data.
 * @param {string} notesData.topicsCovered - Topics covered in the session.
 * @param {string} notesData.conceptsMastered - Concepts mastered.
 * @param {string} notesData.areasForImprovement - Areas needing improvement.
 * @param {string} notesData.homeworkAssigned - Homework assigned.
 * @param {string} notesData.nextSteps - Next steps and recommendations.
 * @param {string} notesData.generalNotes - General notes.
 * @returns {Promise<object>} The updated booking object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateSessionNotes = (bookingId, notesData) =>
  apiRequest(`/api/bookings/${bookingId}/notes`, {
    method: 'PUT',
    body: JSON.stringify(notesData),
  });

/**
 * Gets session notes for a booking.
 * @param {string} bookingId - The ID of the booking.
 * @returns {Promise<object>} The session notes and booking info.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getSessionNotes = (bookingId) =>
  apiRequest(`/api/bookings/${bookingId}/notes`, { method: 'GET' });

/**
 * Gets a single booking by ID.
 * @param {string} bookingId - The ID of the booking.
 * @returns {Promise<object>} The booking object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getBookingById = (bookingId) =>
  apiRequest(`/api/bookings/${bookingId}`, { method: 'GET' });
