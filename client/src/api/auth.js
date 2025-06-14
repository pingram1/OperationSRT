/**
 * This file contains functions for making API calls to your backend's
 * authentication endpoints.
 */

/**
 * Sends a registration request to the server.
 * @param {object} userData - The user's data (name, email, password, role).
 * @returns {Promise<object>} The server's JSON response, typically a token.
 * @throws {Error} If the API call fails or returns an error.
 */
export const registerUser = async (userData) => {
    // We remove the confirmPassword field before sending to the backend
    const { confirmPassword, ...apiData } = userData;

    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
    });

    // If the server response is not "ok" (e.g., status 400 or 500),
    // we parse the error message from the body and throw an error.
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register');
    }

    return response.json();
};

/**
 * Sends a login request to the server.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<object>} The server's JSON response, including user data and a token.
 * @throws {Error} If the API call fails or returns an error.
 */
export const loginUser = async (email, password) => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to log in');
    }
  
    const data = await response.json();
    return data;
};