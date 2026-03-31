import { getSecureToken, clearSecureToken } from './authStorage';

/**
 * A custom error class to provide more detail on API-related failures.
 */
export class ApiError extends Error {
  constructor(message, status, sessionExpired = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.sessionExpired = sessionExpired;
  }
}

/**
 * Get the base API URL
 */
const getApiBaseUrl = () => {
  // In development, Vite proxy handles /api routes
  // In production, use environment variable or default to relative path
  return import.meta.env.VITE_API_URL || '';
};

/**
 * A centralized utility function for making authenticated API requests.
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/users/profile').
 * @param {object} options - The configuration options for the fetch request.
 * @param {boolean} requireAuth - Whether authentication is required (default: true).
 * @returns {Promise<object>} The JSON response from the server.
 * @throws {ApiError|Error} Throws a custom ApiError for server responses or a generic Error for network issues.
 */
export async function apiRequest(endpoint, options = {}, requireAuth = true) {
  try {
    const token = getSecureToken();
    
    if (requireAuth && !token) {
      throw new ApiError('Authentication required. Please log in.', 401);
    }
    
    // Check if body is FormData - if so, don't set Content-Type (browser will set it with boundary)
    const isFormData = options.body instanceof FormData;
    
    const defaultHeaders = {};
    
    // Only set Content-Type for non-FormData requests
    if (!isFormData) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    
    if (token && requireAuth) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    // Build full URL
    const baseUrl = getApiBaseUrl();
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      let errorMessage = 'Request failed';
      let sessionExpired = false;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        // Token expired or invalid - clear it and notify app
        if (response.status === 401 && (errorMessage?.toLowerCase().includes('token') || errorMessage?.toLowerCase().includes('not valid'))) {
          clearSecureToken();
          sessionExpired = true;
          errorMessage = 'Your session has expired. Please log in again.';
          window.dispatchEvent(new CustomEvent('sessionExpired'));
        }
      } catch (parseError) {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch (textError) {
          // fall through to switch
        }
        if (!sessionExpired && response.status === 401) {
          clearSecureToken();
          sessionExpired = true;
          errorMessage = 'Your session has expired. Please log in again.';
          window.dispatchEvent(new CustomEvent('sessionExpired'));
        } else if (!sessionExpired) {
          switch (response.status) {
            case 401:
              errorMessage = errorMessage || 'Authentication required. Please log in again.';
              break;
            case 403:
              errorMessage = 'You do not have permission to perform this action.';
              break;
            case 404:
              errorMessage = 'The requested resource was not found.';
              break;
            case 500:
              errorMessage = 'Server error. Please try again later.';
              break;
            default:
              errorMessage = `Request failed with status ${response.status}`;
          }
        }
      }
      throw new ApiError(errorMessage || 'Request failed', response.status, sessionExpired);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors (connection refused, etc.)
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new Error('Network error. Please check your connection and ensure the server is running.');
    }
    // Catches network failures, CORS issues, etc.
    throw new Error('A network error occurred. Please check your connection.');
  }
}


