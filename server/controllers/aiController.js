/**
 * This controller handles all interactions with the Google Gemini API,
 * ensuring that the API key is never exposed to the client.
 */
const generateAiContent = async (req, res) => {
    // Get the prompt and responseType from the client's request body
    const { prompt, responseType = 'text' } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: 'A prompt is required.' });
    }

    // Securely get the API key from your server's environment variables
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
        return res.status(500).json({ message: 'API key not configured on the server.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [{ text: prompt }]
        }],
    };
    
    // Add schema for JSON responses if requested
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
                        }
                    }
                },
            }
        };
    }

    try {
        const fetch = (await import('node-fetch')).default;
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error('Gemini API Error:', errorData);
            return res.status(geminiResponse.status).json({ message: 'Failed to get a response from the AI service.' });
        }

        const data = await geminiResponse.json();

        // Send the successful response from Gemini back to our client
        res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).send('Server error while communicating with the AI service.');
    }
};

module.exports = {
    generateAiContent,
};
