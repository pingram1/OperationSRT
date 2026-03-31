import { apiRequest } from './apiService';

/**
 * Get all challenges
 * @param {object} filters - Optional filters (subject, difficulty, includeInactive)
 * @returns {Promise<Array>} Array of challenge objects
 */
export const getAllChallenges = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.subject) params.append('subject', filters.subject);
  if (filters.difficulty) params.append('difficulty', filters.difficulty);
  if (filters.includeInactive) params.append('includeInactive', filters.includeInactive);
  
  const queryString = params.toString();
  const endpoint = `/api/challenges${queryString ? `?${queryString}` : ''}`;
  return apiRequest(endpoint, { method: 'GET' });
};

/**
 * Get a specific challenge by ID
 * @param {string} challengeId - The challenge ID
 * @returns {Promise<object>} Challenge object
 */
export const getChallenge = (challengeId) =>
  apiRequest(`/api/challenges/${challengeId}`, { method: 'GET' });

/**
 * Get a specific challenge by ID (alias for getChallenge)
 * @param {string} challengeId - The challenge ID
 * @returns {Promise<object>} Challenge object with attempt info
 */
export const getChallengeById = (challengeId) =>
  apiRequest(`/api/challenges/${challengeId}`, { method: 'GET' });

/**
 * Start a challenge (create attempt)
 * @param {string} challengeId - The challenge ID
 * @returns {Promise<object>} Challenge and attempt objects
 */
export const startChallenge = (challengeId) =>
  apiRequest(`/api/challenges/${challengeId}/start`, {
    method: 'POST',
  });

export const submitAnswer = (challengeId, answerData) =>
    apiRequest(`/api/challenges/${challengeId}/answer`, {
        method: 'POST',
        body: JSON.stringify(answerData),
    });

/**
 * Complete a challenge attempt
 * @param {string} challengeId - The challenge ID
 * @returns {Promise<object>} Final attempt result
 */
export const completeChallenge = (challengeId) =>
    apiRequest(`/api/challenges/${challengeId}/complete`, {
        method: 'POST',
    });

/**
 * Get leaderboard
 * @param {number} limit - Number of top users to return (default 10)
 * @returns {Promise<Array>} Array of user objects with XP and stats
 */
export const getLeaderboard = (limit = 10) =>
    apiRequest(`/api/challenges/leaderboard?limit=${limit}`, { method: 'GET' });

/**
 * Create a new challenge (Admin only)
 * @param {object} challengeData - Challenge data object
 * @returns {Promise<object>} Created challenge object
 */
export const createChallenge = (challengeData) =>
    apiRequest('/api/challenges', {
        method: 'POST',
        body: JSON.stringify(challengeData),
    });

/**
 * Update an existing challenge (Admin only)
 * @param {string} challengeId - The challenge ID
 * @param {object} challengeData - Updated challenge data
 * @returns {Promise<object>} Updated challenge object
 */
export const updateChallenge = (challengeId, challengeData) =>
    apiRequest(`/api/challenges/${challengeId}`, {
        method: 'PUT',
        body: JSON.stringify(challengeData),
    });

/**
 * Delete a challenge (Admin only)
 * @param {string} challengeId - The challenge ID
 * @returns {Promise<object>} Success message
 */
export const deleteChallenge = (challengeId) =>
    apiRequest(`/api/challenges/${challengeId}`, {
        method: 'DELETE',
    });

