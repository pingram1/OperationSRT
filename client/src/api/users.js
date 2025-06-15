/**
 * This file contains functions for making API calls to your backend's
 * user-related endpoints. It assumes that an authentication token is
 * stored and sent with each request for protected routes.
 */

/**
 * Fetches the profile of the currently authenticated user.
 * @returns {Promise<object>} The user profile object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getUserProfile = async () => {
    const token = localStorage.getItem('token'); // In a real app, you'd get the auth token

    const response = await fetch('/api/users/profile', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Send token for protected routes
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch user profile.');
    }

    return response.json();
};

/**
 * Updates the profile of the currently authenticated user.
 * @param {object} profileData - The updated profile data.
 * @returns {Promise<object>} The updated user profile object from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateUserProfile = async (profileData) => {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile.');
    }

    return response.json();
};

/**
 * Fetches a list of all users. (Admin only)
 * This is an example of a protected route that would require an admin role.
 * @returns {Promise<Array>} An array of all user objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAllUsers = async () => {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users.');
    }

    return response.json();
};
