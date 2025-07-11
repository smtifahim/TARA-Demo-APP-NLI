// Gemini API Integration for TARA Acupoint Research NLI

// Configuration settings for Gemini API
const GEMINI_CONFIG = {
    apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    model: "gemini-2.0-flash",
    defaultSystemPrompt: null // Will be loaded from external file
};

// Store prompts loaded from external files
let LOADED_PROMPTS = {
    extraction: null,
    summarization: null
};

// Store API key securely in session storage (not visible in code)
let GEMINI_API_KEY = "";

// Initialize prompts when page loads
document.addEventListener('DOMContentLoaded', async function() {
    GEMINI_API_KEY = sessionStorage.getItem("gemini_api_key") || "";
    
    // Load prompts from external files
    try {
        LOADED_PROMPTS.extraction = await window.PromptLoader.buildExtractionPrompt('gemini');
        GEMINI_CONFIG.defaultSystemPrompt = LOADED_PROMPTS.extraction;
        console.log('Gemini prompts loaded successfully');
    } catch (error) {
        console.error('Critical error: Failed to load Gemini prompts:', error);
        alert('Error: Could not load prompt files. Please ensure all prompt files are available.');
        // Set a minimal prompt to prevent crashes, but user should fix the issue
        GEMINI_CONFIG.defaultSystemPrompt = 'Error: Prompt files not found. Please check prompt files.';
    }
});

// Function to set API key
function setGeminiApiKey(apiKey) {
    if (apiKey) {
        GEMINI_API_KEY = apiKey;
        // Store in session storage (cleared when browser is closed)
        sessionStorage.setItem("gemini_api_key", apiKey);
        return true;
    }
    return false;
}

// Check if API key is set
function isGeminiApiKeySet() {
    return GEMINI_API_KEY !== "";
}

// Prompt for API key if not set
function promptForGeminiApiKey() {
    if (!isGeminiApiKeySet()) {
        const apiKey = prompt("Please enter your Gemini API key:");
        if (apiKey) {
            setGeminiApiKey(apiKey);
            return true;
        }
        return false;
    }
    return true;
}

// Extract filters from natural language query using Gemini
async function extractFiltersWithGemini(query) {
    // Make sure we have an API key
    if (!promptForGeminiApiKey()) {
        throw new Error("Gemini API key is required for natural language processing");
    }
    
    // Show loading indicator
    document.getElementById('results').innerHTML = '<p>Analyzing your question with Gemini...</p>';
    
    try {
        // Log the request details for debugging
        console.log(`Sending request to Gemini API with model: ${GEMINI_CONFIG.model}`);
        
        // Prepare the request data for Gemini
        const requestData = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: query
                        }
                    ]
                }
            ],
        systemInstruction: {
                parts: [
                    {
                        text: GEMINI_CONFIG.defaultSystemPrompt
                    }
                ]
            },
        // systemInstruction: {
        //     parts: [{
        //     text: "You are an expert at summarizing acupuncture research. Write clear, factual summaries using markdown headings."
        //     }]
        //     },
            generationConfig: {
                maxOutputTokens: 1200
            }
        };

        // Add API key to URL
        const apiUrl = `${GEMINI_CONFIG.apiEndpoint}?key=${GEMINI_API_KEY}`;
        
        // Direct API call to Gemini
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        
        // Extract the response text from Gemini's response format
        const content = data.candidates && 
                      data.candidates[0] && 
                      data.candidates[0].content && 
                      data.candidates[0].content.parts && 
                      data.candidates[0].content.parts[0] && 
                      data.candidates[0].content.parts[0].text;
                      
        if (!content) {
            throw new Error("Invalid response from Gemini API");
        }
        
        // Parse the JSON content from Gemini's response
        // Look for JSON in the response text (it might be surrounded by markdown or other text)
        const jsonMatch = content.match(/```json([\s\S]*?)```/) || 
                         content.match(/\{[\s\S]*?\}/);
                          
        let parsedFilters = {};
        
        if (jsonMatch) {
            try {
                // If we found JSON in markdown code block, extract just the JSON part
                const jsonStr = jsonMatch[0].startsWith('```') ? jsonMatch[1].trim() : jsonMatch[0];
                parsedFilters = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse JSON from Gemini response:", e);
            }
        } else {
            console.warn("No JSON found in Gemini response:", content);
        }
        
        // Log the extracted filters
        console.log("Extracted filters:", parsedFilters);
        return parsedFilters;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        document.getElementById('results').innerHTML = `<p>Error analyzing your question: ${error.message}</p>`;
        return {};
    }
}

// Add summarization function using Gemini
async function summarizeResultsWithGemini(query, results) {
    // Make sure we have an API key
    if (!promptForGeminiApiKey()) {
        return "API key required for summarization";
    }
    
    try {
        // Extract key information from results to limit token usage using shared function from api-provider.js
        const summarizedResults = window.extractSummaryDataFromResults(results);
        
        console.log(`Summarizing results with Gemini API call`);
        
        // Load prompts from external files
        const prompts = await window.PromptLoader.buildSummarizationPrompts('gemini', query, summarizedResults);
        
        // Prepare the request data for Gemini
        const requestData = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: prompts.userPrompt
                        }
                    ]
                }
            ],
            systemInstruction: {
                parts: [
                    {
                        text: prompts.systemInstruction
                    }
                ]
            },
            generationConfig: {
                maxOutputTokens: 1600
            }
        };
        
        // Add API key to URL
        const apiUrl = `${GEMINI_CONFIG.apiEndpoint}?key=${GEMINI_API_KEY}`;

        // Direct API call
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        
        // Extract the response text from Gemini's response format
        const content = data.candidates && 
                      data.candidates[0] && 
                      data.candidates[0].content && 
                      data.candidates[0].content.parts && 
                      data.candidates[0].content.parts[0] && 
                      data.candidates[0].content.parts[0].text;
        
        if (!content) {
            throw new Error("Invalid response from Gemini API");
        }
        
        return content;
    } catch (error) {
        console.error("Error calling Gemini API for summarization:", error);
        return `Error generating summary: ${error.message}`;
    }
}

// Function to validate the Gemini API key
async function validateGeminiApiKey(apiKey) {
    try {
        const testPrompt = "Say hello.";
        
        // Use provided key or the stored one
        const keyToTest = apiKey || GEMINI_API_KEY;
        
        if (!keyToTest) {
            return {
                valid: false,
                message: "No API key provided"
            };
        }
        
        console.log("Validating Gemini API key...");
        
        // Prepare a minimal test request
        const requestData = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: testPrompt
                        }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: 10
            }
        };
        
        // Add API key to URL
        const apiUrl = `${GEMINI_CONFIG.apiEndpoint}?key=${keyToTest}`;
        
        console.log("Sending API validation request to Gemini");
        
        // Make a minimal test request to Gemini API directly
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        // Log the response status
        console.log("API validation response status:", response.status);
        
        if (response.ok) {
            // Try to parse the response as JSON to confirm it's valid
            try {
                const data = await response.json();
                console.log("API validation successful");
                return {
                    valid: true,
                    message: "API key is valid"
                };
            } catch (jsonError) {
                console.error("Error parsing API validation response:", jsonError);
                return {
                    valid: false,
                    message: `Error parsing API response: ${jsonError.message}`
                };
            }
        } else {
            // Handle different error status codes
            console.error("API validation failed with status:", response.status);
            
            // Try to get error details
            try {
                const errorData = await response.json();
                console.error("API error details:", errorData);
                
                return {
                    valid: false,
                    message: `API key validation failed: ${errorData.error?.message || response.statusText}`,
                    details: errorData
                };
            } catch (jsonError) {
                // If we can't parse the error as JSON
                return {
                    valid: false,
                    message: `API request failed: ${response.status} ${response.statusText}`,
                    status: response.status
                };
            }
        }
    } catch (error) {
        console.error("Network or other error during API validation:", error);
        
        // More detailed error information
        let errorDetails = "Unknown error";
        if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
            errorDetails = `Network issue: ${error.message}. This may be due to:
                1. No internet connection
                2. A network firewall or security software
                3. The API endpoint being unreachable`;
        } else {
            errorDetails = `${error.name}: ${error.message}`;
        }
        
        return {
            valid: false,
            message: `Error validating API key: ${error.message}`,
            details: errorDetails,
            error: error
        };
    }
}

// Make functions available globally
window.extractFiltersWithGemini = extractFiltersWithGemini;
window.summarizeResultsWithGemini = summarizeResultsWithGemini;
window.setGeminiApiKey = setGeminiApiKey;
window.validateGeminiApiKey = validateGeminiApiKey;
window.isGeminiApiKeySet = isGeminiApiKeySet;
