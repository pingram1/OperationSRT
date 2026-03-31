/**
 * Google OAuth authentication API functions
 */

/**
 * Get Google OAuth URL from server
 * @param {string} userType - 'organization' for employees, 'student' for students/parents
 * @returns {Promise<string>} The OAuth URL to redirect to
 */
export const getGoogleAuthUrl = async (userType = 'student') => {
  try {
    const response = await fetch(`/api/auth/google/url?userType=${userType}`);
    if (!response.ok) {
      throw new Error('Failed to get Google auth URL');
    }
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error getting Google auth URL:', error);
    throw new Error('Failed to initiate Google login');
  }
};

/**
 * Handle Google auth callback
 * Token is passed via URL query params, this function extracts and stores it
 * @param {string} token - JWT token from OAuth callback
 * @param {string} email - User email from OAuth callback
 * @returns {Promise<object>} User data
 */
export const handleGoogleCallback = async (token, email) => {
  try {
    // Token is passed via URL, store it
    if (token) {
      const { setSecureToken } = await import('./authStorage.js');
      setSecureToken(token);
      
      // Get user profile
      const { getUserProfile } = await import('./users.js');
      const userData = await getUserProfile();
      
      return userData;
    }
    throw new Error('No token received');
  } catch (error) {
    console.error('Error handling Google callback:', error);
    throw error;
  }
};







