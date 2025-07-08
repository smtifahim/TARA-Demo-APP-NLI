// Gemini API Integration for TARA Acupoint Research NLI

// Configuration settings for Gemini API
const GEMINI_CONFIG = {
    apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    model: "gemini-2.0-flash",
    defaultSystemPrompt: `You are an AI assistant specialized in analyzing acupuncture research queries. 
    Extract search parameters from natural language queries about acupuncture research.
    Return a JSON with these fields if found in the query:
    - acupoint: The name of any acupoint mentioned (e.g., "LI4", "Hegu", "ST36", "Special Point")
    - meridian: Any meridian mentioned (e.g., "Lung", "Large Intestine", "Heart")
    - special_point_category: Any special point category (e.g., "Back-Shu Point", "He-Sea Point")
    - surface_region: Anatomical surface region (e.g., "forearm", "face", "knee")
    - related_region: Related anatomical region (e.g., "fibula", "tibialis anterior", "dorsum of the hand")
    - body_region: Body region (e.g., "upper limb segment", "trunk", "head", "face")
    - studied_condition: Health condition being researched (e.g., "low back pain", "migraine", "headache")
    - condition_context: Context of the condition (e.g., "Pain", "Addiction")
    - country: Country where research was conducted (e.g., "China", "United States")
    Only include fields for which you have extracted values from the query.
    `
};

// Store API key securely in session storage (not visible in code)
let GEMINI_API_KEY = "";

// Attempt to load the API key from session storage when the page loads
document.addEventListener('DOMContentLoaded', function() {
    GEMINI_API_KEY = sessionStorage.getItem("gemini_api_key") || "";
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
            generationConfig: {
                maxOutputTokens: 1000
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
        
        // Create prompt for Gemini to summarize the results
        const summarizationPrompt = `
User query: "${query}"

Here are the search results:
${JSON.stringify(summarizedResults, null, 2)}

Please provide a well-structured summary of these research findings in a clear, readable style. You MUST:

1. Present information in natural paragraphs and simple bullet points. Omit sections if insufficient data exists.

2. Structure your response with these sections using "##" markdown headings:

## Overview
A brief introduction in 2-3 sentences about the research findings, including the number of studies found and their general focus.

## Most Common Acupoints
Only list the 4 most frequently used acupoints as a simple bullet point with a complete sentence or two:
- LI4 (Hegu) was studied in 5 articles examining headache and pain. Include special point category (e.g., "Back-Shu Point") for each significant acupoint if applicable
Don't include more than 4 most frequently used acupoints.
Don't use bold text or special formatting - just write in a natural, narrative style.

## Key Conditions Studied
Describe each main condition in a clear, readable way. Consider condition note and context (if known):
- Lower back pain appeared in 12 studies, which primarily examined acupoints BL23, BL25, and GB30.
- Headache was researched in 8 articles, most commonly using the acupoints GB20, LI4, and TE5.

## Research Methodologies
Describe the types of studies in natural sentences rather than using special formatting:
- The research consists of 7 randomized controlled trials, 2 systematic reviews, and 1 case studies.
- Control groups and additional details on study designs were not consistently reported
- Acupuncture modalities used such as electrical acupuncture, manual acupuncture, and moxibustion.

## Anatomical Context
Describe the anatomical context of the acupoints and body regions studied:
- The acupoints studied are primarily located on the upper limb segment, trunk, and head.

## Correlation Patterns
Present patterns using simple language and bullet points:
- Specific acupoints and conditions that are frequently studied together
- Special point roles for the specific acupoints above (if available)
- Meridians and research focus areas
- Geographic or temporal trends in the research

## Conclusion
A focused 2-3 sentence conclusion directly addressing the user's query: "${query}"

Present facts in a straightforward, academic manner in complete sentences. NEVER start paragraphs or non-list lines with dashes, hyphens, or any special characters. Use proper bullet points formatted as "- " (dash + space) ONLY when creating list items. IMPORTANT: Do not start any paragraph with a dash. Format all bullet points as proper list items. ALWAYS use digits (1, 2, 3...) instead of number words (one, two, three...) when referring to quantities. Focus on making the content readable and natural rather than highly structured. Avoid making claims about treatment effectiveness.`;

        // Prepare the request data for Gemini
        const requestData = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: summarizationPrompt
                        }
                    ]
                }
            ],
            systemInstruction: {
                parts: [
                    {
                        text: "You are an expert acupuncture research scientist who specializes in creating clear and informative research summaries. Format your response following these guidelines:\n\n1. Use '## ' (double hash + space) for main section headers\n2. Use '### ' (triple hash + space) for any subsection headers if needed\n3. Write in a clear, natural style with complete sentences and paragraphs\n4. ONLY use '- ' (dash + space) when creating proper bullet point lists\n5. NEVER start paragraphs or non-list content with dashes or special characters\n6. Keep your writing style straightforward and academic\n7. Leave appropriate spacing between sections\n8. ALWAYS use digits (2, 5, 10) instead of writing out numbers as words (two, five, ten)\n\nFor the 'Most Common Acupoints' section:\n- List acupoints using proper bullet points only\n- Include the acupoint name, conditions it was studied for, and general location\n- Example: '- LI4 (Hegu) was studied in 5 articles related to headache and pain. It is located on the dorsal surface of the hand.'\n\nFor the 'Key Conditions Studied' section:\n- Describe each condition using proper bullet points\n- Mention which acupoints were commonly studied for each condition\n- Example: '- Lower back pain was examined in 12 studies, primarily using acupoints BL23, BL25, and GB30.'\n\nFor the 'Research Methodologies' and other sections:\n- Use clear paragraphs with no special characters at the beginning\n- For lists within these sections, use proper bullet points\n- Include specific numbers when relevant, but maintain a readable flow\n- Prioritize clarity over structured formatting\n\nYour summary should be:\n- Factual and evidence-based\n- Written in a natural, easy-to-read style\n- Free of opinion or effectiveness claims\n- Free of dashes at the beginning of paragraphs or non-list text\n- Using digits (7, 15, 23) instead of number words (seven, fifteen, twenty-three)\n\nOmit sections entirely when you don't have sufficient data."
                    }
                ]
            },
            generationConfig: {
                maxOutputTokens: 1200
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
