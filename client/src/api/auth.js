/**
 * This file contains functions for making API calls to your backend's
 * authentication endpoints.
 */

/**
 * Sends a registration request to the server.
 * @param {object} userData - The user's data (name, email, password, role).
 * @returns {Promise<object>} The server's JSON response, containing token and user data.
 * @throws {Error} If the API call fails or returns an error.
 */
export const registerUser = async (userData) => {
    try {
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
            const errorData = await response.json().catch(() => ({ 
                message: 'Registration failed. Please try again.' 
            }));
            
            // More specific error message for database issues
            if (response.status === 503) {
                throw new Error(errorData.message || 'Database unavailable. Please contact support.');
            }
            
        throw new Error(errorData.message || 'Failed to register');
    }

        const data = await response.json();
        return data;
    } catch (error) {
        // Re-throw if it's already an Error with a message
        if (error instanceof Error) {
            throw error;
        }
        // Otherwise wrap it
        throw new Error('Network error. Please check your connection.');
    }
};

/**
 * Sends a login request to the server.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<object>} The server's JSON response, including user data and a token.
 * @throws {Error} If the API call fails or returns an error.
 */
export const loginUser = async (email, password) => {
    try {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
                message: 'Failed to log in. Please check your credentials.' 
            }));
        throw new Error(errorData.message || 'Failed to log in');
    }
  
    const data = await response.json();
    return data;
    } catch (error) {
        // Re-throw if it's already an Error with a message
        if (error instanceof Error) {
            throw error;
        }
        // Otherwise wrap it
        throw new Error('Network error. Please check your connection.');
    }
};

/**
 * Sends a "register with school registration code" request.
 * Public endpoint. Returns the newly-created student plus a JWT.
 * @param {object} userData - { name, email, password, registrationCode }
 * @returns {Promise<object>} Server response containing token, user, and school metadata.
 * @throws {Error} If the API call fails or returns an error.
 */
export const registerWithCode = async (userData) => {
    try {
        const { confirmPassword, ...apiData } = userData || {};

        const response = await fetch('/api/auth/register-with-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: 'Registration failed. Please try again.',
            }));

            if (response.status === 503) {
                throw new Error(errorData.message || 'Database unavailable. Please contact support.');
            }

            const err = new Error(errorData.message || 'Failed to register');
            err.status = response.status;
            throw err;
        }

        return response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Network error. Please check your connection.');
    }
};

/**
 * Sends an employee registration request to the server.
 * @param {object} userData - The employee's data (name, email, password, role).
 * @param {string} token - Optional auth token (required if creating admin when one already exists).
 * @returns {Promise<object>} The server's JSON response, containing token and user data.
 * @throws {Error} If the API call fails or returns an error.
 */
export const registerEmployee = async (userData, token = null) => {
    try {
        // We remove the confirmPassword field before sending to the backend
        const { confirmPassword, ...apiData } = userData;

        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/auth/register-employee', {
            method: 'POST',
            headers,
            body: JSON.stringify(apiData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
                message: 'Employee registration failed. Please try again.' 
            }));
            
            if (response.status === 503) {
                throw new Error(errorData.message || 'Database unavailable. Please contact support.');
            }
            
            throw new Error(errorData.message || 'Failed to register employee');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Network error. Please check your connection.');
    }
};