import { apiRequest } from './apiService';

/**
 * Gets the tutor's payroll/earnings summary.
 * @param {object} dateRange - Optional { startDate, endDate }
 * @returns {Promise<object>} The payroll summary object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getTutorPayroll = (dateRange = {}) => {
  const params = new URLSearchParams();
  if (dateRange.startDate) params.append('startDate', dateRange.startDate);
  if (dateRange.endDate) params.append('endDate', dateRange.endDate);
  
  const queryString = params.toString();
  const endpoint = `/api/payroll/me${queryString ? `?${queryString}` : ''}`;
  return apiRequest(endpoint, { method: 'GET' });
};

/**
 * Gets the tutor's unpaid earnings.
 * @returns {Promise<object>} The unpaid earnings object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getUnpaidEarnings = () => 
  apiRequest('/api/payroll/me/unpaid', { method: 'GET' });

/**
 * Checks the tutor's compliance/payable status.
 * @returns {Promise<object>} The compliance status object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const checkCompliance = () => 
  apiRequest('/api/payroll/me/compliance', { method: 'GET' });












