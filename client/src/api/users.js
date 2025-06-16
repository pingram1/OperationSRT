import { getSecureToken } from './authStorage';

/**
 * A custom error class to provide more detail on API-related failures.
 */
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * A centralized utility function for making authenticated API requests.
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/users/profile').
 * @param {object} options - The configuration options for the fetch request.
 * @returns {Promise<object>} The JSON response from the server.
 * @throws {ApiError|Error} Throws a custom ApiError for server responses or a generic Error for network issues.
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const token = getSecureToken();
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    const response = await fetch(endpoint, config);

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        errorData.message || 'Request failed', 
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Catches network failures, CORS issues, etc.
    throw new Error('A network error occurred. Please check your connection.');
  }
}

/**
 * Fetches the profile of the currently authenticated user.
 */
export const getUserProfile = () => 
  apiRequest('/api/users/profile', { method: 'GET' });

/**
 * Updates the profile of the currently authenticated user.
 * @param {object} profileData - The updated profile data.
 */
export const updateUserProfile = (profileData) => {
  // Basic client-side validation
  if (!profileData || typeof profileData !== 'object') {
    throw new Error('Invalid profile data provided.');
  }

  return apiRequest('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
};

/**
 * Fetches a list of all users. (Admin only)
 */
export const getAllUsers = () => 
  apiRequest('/api/users', { method: 'GET' });