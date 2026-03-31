import { apiRequest } from './apiService';

/** Public rules for UI (no auth). */
export const getScholarshipConfig = () =>
  apiRequest('/api/scholarship/config', { method: 'GET' }, false);

export const getScholarshipWallet = () =>
  apiRequest('/api/scholarship/wallet', { method: 'GET' });

export const getScholarshipLedger = (params = {}) => {
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.skip != null) q.set('skip', String(params.skip));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiRequest(`/api/scholarship/ledger${suffix}`, { method: 'GET' });
};

export const getScholarshipPayoutRequests = () =>
  apiRequest('/api/scholarship/payout-requests', { method: 'GET' });

/**
 * @param {{ amountCents: number, parentConsentAttested?: boolean }} body
 */
export const postScholarshipPayoutRequest = (body) =>
  apiRequest('/api/scholarship/payout-request', {
    method: 'POST',
    body: JSON.stringify(body),
  });
