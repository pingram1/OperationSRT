import { apiRequest } from './apiService';

/**
 * Fetches all active resources.
 * @param {object} filters - Optional filters (type, subject)
 * @returns {Promise<Array>} An array of resource objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAllResources = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.subject) params.append('subject', filters.subject);
  
  const queryString = params.toString();
  const endpoint = `/api/resources${queryString ? `?${queryString}` : ''}`;
  return apiRequest(endpoint, { method: 'GET' });
};

/**
 * Fetches all resources (Admin only - includes inactive).
 * @returns {Promise<Array>} An array of all resource objects.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getAllResourcesAdmin = () => 
  apiRequest('/api/resources/admin', { method: 'GET' });

/**
 * Fetches a single resource by ID.
 * @param {string} resourceId - The ID of the resource to fetch.
 * @returns {Promise<object>} The resource object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const getResourceById = (resourceId) => 
  apiRequest(`/api/resources/${resourceId}`, { method: 'GET' });

/**
 * Creates a new resource (Admin only).
 * @param {object} resourceData - The data for the new resource.
 * @returns {Promise<object>} The newly created resource object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const createResource = (resourceData) => 
  apiRequest('/api/resources', {
    method: 'POST',
    body: JSON.stringify(resourceData)
  });

/**
 * Creates a resource with an uploaded document (Admin only).
 * @param {FormData} formData - FormData with 'document' file and fields: title, subject, description, duration
 * @returns {Promise<object>} The newly created resource object.
 */
export const createResourceWithDocument = (formData) =>
  apiRequest('/api/resources/upload', {
    method: 'POST',
    body: formData
  });

/**
 * Updates a resource (Admin only).
 * @param {string} resourceId - The ID of the resource to update.
 * @param {object} resourceData - The updated resource data.
 * @returns {Promise<object>} The updated resource object.
 * @throws {Error} If the API call fails or returns an error.
 */
export const updateResource = (resourceId, resourceData) =>
  apiRequest(`/api/resources/${resourceId}`, {
    method: 'PUT',
    body: JSON.stringify(resourceData),
  });

/**
 * Deletes a resource (Admin only).
 * @param {string} resourceId - The ID of the resource to delete.
 * @returns {Promise<object>} A success message from the server.
 * @throws {Error} If the API call fails or returns an error.
 */
export const deleteResource = (resourceId) => 
  apiRequest(`/api/resources/${resourceId}`, { method: 'DELETE' });

/**
 * Generates MLA Citation Guide PDF and creates resource (Admin only).
 * @returns {Promise<object>} The created resource object with PDF.
 * @throws {Error} If the API call fails or returns an error.
 */
export const generateMLAPDF = () => 
  apiRequest('/api/resources/generate-mla-pdf', { method: 'POST' });

/**
 * Gets the PDF URL for a resource.
 * @param {string} resourceId - The ID of the resource.
 * @returns {string} The URL to access the PDF.
 */
export const getResourcePDFUrl = (resourceId) => {
    // Use the API endpoint that requires authentication
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${API_BASE_URL}/api/resources/${resourceId}/pdf`;
};

