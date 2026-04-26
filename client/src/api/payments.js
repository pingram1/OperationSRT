import { getSecureToken } from './authStorage';

const API_BASE_URL = '/api/payments';

/**
 * Create a payment intent for a booking.
 * Amount is determined server-side from the booking record (never trust client).
 */
export const createPaymentIntent = async (bookingId, currency = 'USD') => {
    try {
        const token = getSecureToken();
        const response = await fetch(`${API_BASE_URL}/create-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                bookingId,
                currency,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create payment intent');
        }

        return await response.json();
    } catch (error) {
        console.error('[createPaymentIntent] Error:', error);
        throw error;
    }
};

/**
 * Confirm payment after successful Stripe payment
 */
export const confirmPayment = async (paymentIntentId, bookingId) => {
    try {
        const token = getSecureToken();
        const response = await fetch(`${API_BASE_URL}/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                paymentIntentId,
                bookingId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to confirm payment');
        }

        return await response.json();
    } catch (error) {
        console.error('[confirmPayment] Error:', error);
        throw error;
    }
};

/**
 * Get payment status for a booking
 */
export const getPaymentStatus = async (bookingId) => {
    try {
        const token = getSecureToken();
        const response = await fetch(`${API_BASE_URL}/status/${bookingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to get payment status');
        }

        return await response.json();
    } catch (error) {
        console.error('[getPaymentStatus] Error:', error);
        throw error;
    }
};





