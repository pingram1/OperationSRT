/**
 * Utility functions for role checking
 */

/**
 * Check if a user has admin privileges (admin or super_admin)
 * @param {string} role - The user's role
 * @returns {boolean} - True if user is admin or super_admin
 */
const isAdmin = (role) => {
    return role === 'admin' || role === 'super_admin';
};

/**
 * Check if a user has super admin privileges
 * @param {string} role - The user's role
 * @returns {boolean} - True if user is super_admin
 */
const isSuperAdmin = (role) => {
    return role === 'super_admin';
};

module.exports = {
    isAdmin,
    isSuperAdmin
};







