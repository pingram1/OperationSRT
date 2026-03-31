import { apiRequest } from './apiService';

/**
 * Get all available membership plans
 * @returns {Promise<Array>} Array of membership plan objects
 */
export const getAllMembershipPlans = () =>
  apiRequest('/api/memberships', { method: 'GET' });

/**
 * Get a specific membership plan by ID
 * @param {string} planId - The plan ID
 * @returns {Promise<Object>} Membership plan object
 */
export const getPlanById = (planId) =>
  apiRequest(`/api/memberships/${planId}`, { method: 'GET' });

/**
 * Get current user's membership
 * @returns {Promise<Object>} Current user's membership object
 */
export const getCurrentMembership = () =>
  apiRequest('/api/memberships/current', { method: 'GET' });

/**
 * Get remaining sessions for current month (students with session-based membership)
 * @returns {Promise<Object>} { sessionsAllowed, sessionsUsed, remaining, promptSchedule } for student,
 *   or { students: [{ studentId, studentName, sessionsAllowed, sessionsUsed, remaining, promptSchedule }] } for parent
 */
export const getRemainingSessions = () =>
  apiRequest('/api/memberships/remaining-sessions', { method: 'GET' });

/**
 * Select/Subscribe to a membership plan
 * @param {string} planId - The plan ID to select
 * @param {Object} sessionConfiguration - Optional session configuration for custom plans
 * @param {string} studentId - Optional student ID (for parents selecting membership for a child)
 * @returns {Promise<Object>} Updated membership object
 */
export const selectMembershipPlan = (planId, sessionConfiguration = null, studentId = null) =>
  apiRequest('/api/memberships/select', {
    method: 'POST',
    body: JSON.stringify({ planId, sessionConfiguration, studentId }),
  });
