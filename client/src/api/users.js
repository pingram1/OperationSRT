import { apiRequest } from './apiService';

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

/**
 * Fetches all tutors (accessible to all authenticated users).
 * @returns {Promise<Array>} An array of tutor user objects.
 */
export const getTutors = () => 
  apiRequest('/api/users/tutors', { method: 'GET' });

/**
 * Updates a user by ID (Admin only).
 * @param {string} userId - The ID of the user to update.
 * @param {object} userData - The updated user data (name, email, role, password, etc.).
 * @returns {Promise<object>} The updated user object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateUser = (userId, userData) => {
  // Basic client-side validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID provided.');
  }

  return apiRequest(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
};

/**
 * Deletes a user by ID (Admin only).
 * @param {string} userId - The ID of the user to delete.
 * @returns {Promise<object>} A success message from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const deleteUser = (userId) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID provided.');
  }

  return apiRequest(`/api/users/${userId}`, {
    method: 'DELETE'
  });
};

/**
 * Updates the current user's password.
 * @param {string} currentPassword - The user's current password.
 * @param {string} newPassword - The new password.
 * @returns {Promise<object>} Success message.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updatePassword = (currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw new Error('Current password and new password are required.');
  }

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  return apiRequest('/api/users/profile/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  });
};

/**
 * Begins TOTP 2FA enrollment. 2FA is NOT active until a code is verified via
 * verifyTwoFactorSetup.
 * @returns {Promise<{message: string, otpauthUrl: string, manualEntryKey: string}>}
 *   The otpauth:// URL (rendered as a QR client-side) and the raw secret for
 *   manual entry. The secret is only ever returned during enrollment.
 * @throws {Error} If the API call fails or returns an error.
 */
export const enableTwoFactor = () => {
  return apiRequest('/api/users/profile/2fa/enable', {
    method: 'POST'
  });
};

/**
 * Verifies a TOTP code and activates 2FA (promotes the pending secret).
 * @param {string} token - The 6-digit code from the authenticator app.
 * @returns {Promise<{message: string, twoFactorEnabled: boolean}>}
 * @throws {Error} If the API call fails or the code is invalid.
 */
export const verifyTwoFactorSetup = (token) => {
  if (!token) {
    throw new Error('A verification code is required.');
  }

  return apiRequest('/api/users/profile/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ token: String(token).trim() })
  });
};

/**
 * Disables two-factor authentication for the current user. Requires a current
 * code when 2FA is active (prevents a hijacked session from silently removing
 * the factor).
 * @param {string} [token] - The current 6-digit code (required when 2FA is active).
 * @returns {Promise<{message: string, twoFactorEnabled: boolean}>}
 * @throws {Error} If the API call fails or returns an error.
 */
export const disableTwoFactor = (token) => {
  return apiRequest('/api/users/profile/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ token: token ? String(token).trim() : undefined })
  });
};

/**
 * Fetches all students (Admin only, for parent-child linking).
 * @returns {Promise<Array>} An array of student user objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getStudents = () => 
  apiRequest('/api/users/students', { method: 'GET' });

/**
 * Links a student to a parent (Admin only).
 * @param {string} parentId - The ID of the parent user.
 * @param {string} childId - The ID of the student (child) user.
 * @returns {Promise<object>} Success message with updated parent object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const linkChildToParent = (parentId, childId) => {
  if (!parentId || !childId) {
    throw new Error('Parent ID and Child ID are required.');
  }

  return apiRequest(`/api/users/${parentId}/link-child/${childId}`, {
    method: 'POST'
  });
};

/**
 * Unlinks a student from a parent (Admin only).
 * @param {string} parentId - The ID of the parent user.
 * @param {string} childId - The ID of the student (child) user.
 * @returns {Promise<object>} Success message with updated parent object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const unlinkChildFromParent = (parentId, childId) => {
  if (!parentId || !childId) {
    throw new Error('Parent ID and Child ID are required.');
  }

  return apiRequest(`/api/users/${parentId}/unlink-child/${childId}`, {
    method: 'DELETE'
  });
};

/**
 * Sends a parent link request to a student by email (Parent only).
 * @param {string} studentEmail - The email of the student to link to.
 * @param {string} message - Optional message to include with the request.
 * @returns {Promise<object>} Success message with request object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const sendParentLinkRequest = (studentEmail, message = '') => {
  if (!studentEmail) {
    throw new Error('Student email is required.');
  }

  return apiRequest('/api/users/parent-link-request', {
    method: 'POST',
    body: JSON.stringify({ studentEmail, message })
  });
};

/**
 * Gets all parent link requests (for students and parents).
 * @returns {Promise<object>} Object containing requests array.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getParentLinkRequests = () => 
  apiRequest('/api/users/parent-link-requests', { method: 'GET' });

/**
 * Accepts a parent link request (Student only).
 * @param {string} requestId - The ID of the request to accept.
 * @returns {Promise<object>} Success message with request object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const acceptParentLinkRequest = (requestId) => {
  if (!requestId) {
    throw new Error('Request ID is required.');
  }

  return apiRequest(`/api/users/parent-link-request/${requestId}/accept`, {
    method: 'PUT'
  });
};

/**
 * Rejects a parent link request (Student only).
 * @param {string} requestId - The ID of the request to reject.
 * @returns {Promise<object>} Success message with request object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const rejectParentLinkRequest = (requestId) => {
  if (!requestId) {
    throw new Error('Request ID is required.');
  }

  return apiRequest(`/api/users/parent-link-request/${requestId}/reject`, {
    method: 'PUT'
  });
};

/**
 * Cancels a parent link request (Parent only).
 * @param {string} requestId - The ID of the request to cancel.
 * @returns {Promise<object>} Success message with request object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const cancelParentLinkRequest = (requestId) => {
  if (!requestId) {
    throw new Error('Request ID is required.');
  }

  return apiRequest(`/api/users/parent-link-request/${requestId}/cancel`, {
    method: 'PUT'
  });
};

/**
 * Updates payment permission for a student (Parent only).
 * @param {string} studentId - The ID of the student.
 * @param {boolean} canMakePayments - Whether the student can make payments.
 * @returns {Promise<object>} Success message with updated permission.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateStudentPaymentPermission = (studentId, canMakePayments) => {
  if (!studentId) {
    throw new Error('Student ID is required.');
  }

  if (typeof canMakePayments !== 'boolean') {
    throw new Error('canMakePayments must be a boolean.');
  }

  return apiRequest(`/api/users/student-payment-permission/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify({ canMakePayments })
  });
};

/**
 * Uploads a certification badge (Tutor, Admin, Super Admin only).
 * @param {FormData} formData - FormData containing badgeImage file and badge details (name, issuedBy, issueDate, expiryDate, credentialId).
 * @returns {Promise<object>} Success message with badge object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const uploadCertificationBadge = (formData) => {
  if (!formData || !(formData instanceof FormData)) {
    throw new Error('FormData with badge image is required.');
  }

  return apiRequest('/api/users/profile/certification-badges', {
    method: 'POST',
    body: formData
  });
};

/**
 * Updates a certification badge (Tutor, Admin, Super Admin only).
 * @param {number} badgeIndex - The index of the badge in the user's certificationBadges array.
 * @param {FormData|object} data - FormData (if updating image) or object with badge details (name, issuedBy, issueDate, expiryDate, credentialId).
 * @returns {Promise<object>} Success message with updated badge object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateCertificationBadge = (badgeIndex, data) => {
  if (badgeIndex === undefined || badgeIndex === null) {
    throw new Error('Badge index is required.');
  }

  const isFormData = data instanceof FormData;
  
  return apiRequest(`/api/users/profile/certification-badges/${badgeIndex}`, {
    method: 'PUT',
    body: isFormData ? data : JSON.stringify(data)
  });
};

/**
 * Deletes a certification badge (Tutor, Admin, Super Admin only).
 * @param {number} badgeIndex - The index of the badge in the user's certificationBadges array.
 * @returns {Promise<object>} Success message.
 * @throws {Error} If the API call fails or returns an error.
 */
export const deleteCertificationBadge = (badgeIndex) => {
  if (badgeIndex === undefined || badgeIndex === null) {
    throw new Error('Badge index is required.');
  }

  return apiRequest(`/api/users/profile/certification-badges/${badgeIndex}`, {
    method: 'DELETE'
  });
};