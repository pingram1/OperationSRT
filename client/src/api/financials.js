import { apiRequest } from './apiService';

/**
 * Fetches financial statistics (revenue, MRR, subscriptions, overdue invoices).
 * @returns {Promise<object>} Financial statistics object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getFinancialStats = () => 
  apiRequest('/api/financials/stats', { method: 'GET' });

/**
 * Fetches revenue trend data for chart visualization.
 * @param {number} days - Number of days to fetch data for (default: 90)
 * @returns {Promise<Array>} Array of revenue data points.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getRevenueTrend = (days = 90) => {
  const params = new URLSearchParams({ days: days.toString() });
  return apiRequest(`/api/financials/revenue-trend?${params}`, { method: 'GET' });
};

/**
 * Fetches recent transactions.
 * @param {object} options - Query options (limit, search)
 * @returns {Promise<Array>} Array of transaction objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getTransactions = (options = {}) => {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.search) params.append('search', options.search);
  
  const queryString = params.toString();
  const endpoint = `/api/financials/transactions${queryString ? `?${queryString}` : ''}`;
  return apiRequest(endpoint, { method: 'GET' });
};

/**
 * Creates a new transaction (Admin only).
 * @param {object} transactionData - The data for the new transaction.
 * @returns {Promise<object>} The newly created transaction object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const createTransaction = (transactionData) => 
  apiRequest('/api/financials/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionData)
  });

