import { apiRequest } from './apiService';

export const getAllVisualizers = (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    const gradeLevel = filters.gradeLevel || filters.grade;
    if (gradeLevel) params.append('gradeLevel', gradeLevel);

    const queryString = params.toString();
    const endpoint = `/api/visualizers${queryString ? `?${queryString}` : ''}`;
    return apiRequest(endpoint, { method: 'GET' });
};

export const getVisualizerByGameId = (gameId) =>
    apiRequest(`/api/visualizers/${gameId}`, { method: 'GET' });

export const startVisualizerSession = (gameId, metadata = {}) =>
    apiRequest(`/api/visualizers/${gameId}/start`, {
        method: 'POST',
        body: JSON.stringify({ metadata }),
    });

export const completeVisualizerSession = (gameId, payload) =>
    apiRequest(`/api/visualizers/${gameId}/complete`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
