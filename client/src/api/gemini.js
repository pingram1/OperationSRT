/**
 * This file centralizes all calls to our application's secure AI proxy endpoint.
 */
import { getSecureToken } from './authStorage'; // Assuming you have secure token handling

/**
 * A secure function to call our backend's Gemini API proxy.
 * @param {string} prompt - The prompt to send to the Gemini model.
 * @param {string} responseType - The expected format ('text' or 'json').
 * @returns {Promise<object|string>} The processed content from the AI.
 * @throws {Error} If the API call fails.
 */
export const callSecureAiProxy = async (prompt, responseType = 'text') => {
    try {
        const token = getSecureToken(); // Get the user's auth token

        const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Send the auth token for verification
            },
            body: JSON.stringify({ prompt, responseType }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'AI request failed.');
        }

        const result = await response.json();
        
        // The structure of the Gemini response is nested, so we extract the useful part.
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts.length > 0) {
            const responseText = result.candidates[0].content.parts[0].text;
            
            if (responseType === 'json') {
                return JSON.parse(responseText);
            }
            return responseText;
        } else {
            throw new Error("Invalid response structure from the AI service.");
        }

    } catch (error) {
        console.error("Secure AI Proxy Error:", error);
        throw error; // Re-throw the error for the component to handle
    }
};
