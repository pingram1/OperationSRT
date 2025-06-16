/**
 * A secure, in-memory storage module for the authentication token.
 * This avoids using localStorage, which is vulnerable to XSS attacks.
 * The token will persist for the life of the user's session in the browser tab.
 */

let secureToken = null;

/**
 * Stores the token in memory.
 * @param {string} token - The JWT received from the server.
 */
export const setSecureToken = (token) => {
  secureToken = token;
};

/**
 * Retrieves the token from memory.
 * @returns {string|null} The stored token.
 */
export const getSecureToken = () => {
  return secureToken;
};

/**
 * Clears the token from memory upon logout.
 */
export const clearSecureToken = () => {
  secureToken = null;
};