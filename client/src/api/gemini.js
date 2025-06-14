/**
 * This file centralizes all API calls to the Google Gemini API.
 * It provides a reusable function to handle different types of requests.
 */

/**
 * A flexible function to call the Google Gemini API.
 * * @param {string} prompt - The prompt to send to the Gemini model.
 * @param {string} responseType - The expected format of the response. Use 'text' for plain text
 * or 'json' for a structured JSON object.
 * @returns {Promise<object|string>} The parsed JSON object or text string from the API.
 * @throws {Error} If the API call fails or returns an error message.
 */
export const callGeminiApi = async (prompt, responseType = 'text') => {
    // In a production app, this API key should be stored securely in an environment variable
    // and the call should ideally be proxied through your own backend to protect the key.
    const apiKey = ""; // Left blank as per instructions

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // --- Construct the request payload ---
    const payload = {
        contents: [{
            role: "user",
            parts: [{
                text: prompt
            }]
        }],
    };

    // If a structured JSON response is required, add the generationConfig to the payload.
    // This schema is designed for the "practice questions" feature.
    if (responseType === 'json') {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    questions: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                question_text: { type: "STRING" },
                                options: { type: "ARRAY", items: { type: "STRING" } },
                                correct_answer: { type: "STRING" },
                                explanation: { type: "STRING" }
                            },
                             required: ["question_text", "options", "correct_answer", "explanation"]
                        }
                    }
                },
                required: ["questions"]
            }
        };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gemini API call failed.');
        }

        const result = await response.json();

        // --- Process the response ---
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts.length > 0) {
            const responseText = result.candidates[0].content.parts[0].text;
            
            if (responseType === 'json') {
                // The API returns the JSON as a string, so it must be parsed.
                return JSON.parse(responseText);
            }
            
            // For 'text' responses, return the string directly.
            return responseText;

        } else {
            // Handle cases where the response structure is unexpected.
            throw new Error("Invalid response structure from Gemini API.");
        }
    } catch (error) {
        console.error("Gemini API call error:", error);
        // Re-throw the error so the calling component can catch it and update the UI.
        throw new Error("There was an issue communicating with the AI assistant.");
    }
};