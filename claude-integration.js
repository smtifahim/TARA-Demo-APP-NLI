// Claude API Integration for TARA Acupoint Research NLI

// Configuration settings for Claude API
const CLAUDE_CONFIG = {
    apiEndpoint: "https://api.anthropic.com/v1/messages",
    apiVersion: "2023-06-01",  // Current production API version
    //apiVersion: "2023-06-01",  // Current production API version
    // model: "claude-3-5-sonnet-20241022",  // Default model, can be changed
    model: "claude-3-opus-20240229",  // Model that's confirmed working with API key
    // model: "claude-3-haiku-20240307",
    fallbackModel: "claude-3-haiku-20240307",  // Faster model for timeout retry
    defaultSystemPrompt: null // Will be loaded from external file
};

// Store prompts loaded from external files
let CLAUDE_LOADED_PROMPTS = {
    extraction: null,
    summarization: null
};

// Store API key securely in session storage (not visible in code)
let CLAUDE_API_KEY = "";

// Initialize prompts when page loads
document.addEventListener('DOMContentLoaded', async function() {
    CLAUDE_API_KEY = sessionStorage.getItem("claude_api_key") || "";
    
    // Load prompts from external files
    try {
        CLAUDE_LOADED_PROMPTS.extraction = await window.PromptLoader.buildExtractionPrompt('claude');
        CLAUDE_CONFIG.defaultSystemPrompt = CLAUDE_LOADED_PROMPTS.extraction;
        console.log('Claude prompts loaded successfully');
    } catch (error) {
        console.error('Critical error: Failed to load Claude prompts:', error);
        alert('Error: Could not load prompt files. Please ensure all prompt files are available.');
        // Set a minimal prompt to prevent crashes, but user should fix the issue
        CLAUDE_CONFIG.defaultSystemPrompt = 'Error: Prompt files not found. Please check prompt files.';
    }
});

// Function to set API key
function setClaudeApiKey(apiKey) {
    if (apiKey) {
        CLAUDE_API_KEY = apiKey;
        // Store in session storage (cleared when browser is closed)
        sessionStorage.setItem("claude_api_key", apiKey);
        return true;
    }
    return false;
}

// Check if API key is set
function isClaudeApiKeySet() {
    return CLAUDE_API_KEY !== "";
}

// Prompt for API key if not set
function promptForApiKey() {
    if (!isClaudeApiKeySet()) {
        const apiKey = prompt("Please enter your Claude API key:");
        if (apiKey) {
            setClaudeApiKey(apiKey);
            return true;
        }
        return false;
    }
    return true;
}

// Extract filters from natural language query using Claude
async function extractFiltersWithClaude(query) {
    // Make sure we have an API key
    if (!promptForApiKey()) {
        throw new Error("Claude API key is required for natural language processing");
    }
    
    // Show loading indicator
    document.getElementById('results').innerHTML = '<p>Analyzing your question with Claude...</p>';
    
    try {
        // Check if we should use the proxy
        const useProxy = isClaudeApiProxyEnabled && isClaudeApiProxyEnabled();
        
        // Log the request details for debugging
        console.log(`Sending request to Claude API with model: ${CLAUDE_CONFIG.model} ${useProxy ? 'via proxy' : 'directly'}`);
        
        let data;
        const requestData = {
            model: CLAUDE_CONFIG.model,
            system: CLAUDE_CONFIG.defaultSystemPrompt,
            messages: [
                {
                    role: "user",
                    content: query
                }
            ],
            max_tokens: 1000
        };
        
        if (useProxy) {
            // Use proxy function
            data = await callClaudeApiWithProxy(requestData, CLAUDE_API_KEY);
        } else {
            // Direct API call
            const response = await fetch(CLAUDE_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': CLAUDE_CONFIG.apiVersion
                },
                mode: 'cors',
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                // If direct call fails with a network error and proxy is available, try with proxy
                if ((response.status === 0 || response.status === 520) && typeof callClaudeApiWithProxy === 'function') {
                    console.log("Direct API call failed, trying with proxy...");
                    // Auto-enable proxy for future requests
                    if (typeof toggleClaudeApiProxy === 'function') {
                        toggleClaudeApiProxy(true);
                    }
                    data = await callClaudeApiWithProxy(requestData, CLAUDE_API_KEY);
                } else {
                    // Other API error
                    const errorText = await response.text();
                    throw new Error(`Claude API error: ${response.status} ${errorText}`);
                }
            } else {
                data = await response.json();
            }
        }
        
        // Extract the JSON from Claude's response
        const content = data.content && data.content[0] && data.content[0].text;
        if (!content) {
            throw new Error("Invalid response from Claude API");
        }
        
        // Parse the JSON content from Claude's response
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
                console.error("Failed to parse JSON from Claude response:", e);
            }
        } else {
            console.warn("No JSON found in Claude response:", content);
        }
        
        // Log the extracted filters
        console.log("Extracted filters:", parsedFilters);
        return parsedFilters;
    } catch (error) {
        console.error("Error calling Claude API:", error);
        
        // Add suggestion to try proxy if it was a network error and proxy is not already enabled
        const useProxy = isClaudeApiProxyEnabled && isClaudeApiProxyEnabled();
        let errorMessage = error.message;
        
        if (!useProxy && error.message.includes("Failed to fetch")) {
            errorMessage += ". Try enabling the proxy server option.";
        }
        
        document.getElementById('results').innerHTML = `<p>Error analyzing your question: ${errorMessage}</p>`;
        return {};
    }
}

// Add summarization function using Claude
async function summarizeResultsWithClaude(query, results) {
    // Make sure we have an API key
    if (!promptForApiKey()) {
        return "API key required for summarization";
    }
    
    try {
        // Extract key information from results to limit token usage using shared function from api-provider.js
        const summarizedResults = window.extractSummaryDataFromResults(results);
        
        // Check if we should use the proxy
        const useProxy = isClaudeApiProxyEnabled && isClaudeApiProxyEnabled();
        console.log(`Summarizing results ${useProxy ? 'using proxy' : 'with direct API call'}`);
        
        // Load prompts from external files
        const prompts = await window.PromptLoader.buildSummarizationPrompts('claude', query, summarizedResults);
        
        // Prepare the request data
        const requestData = {
            model: CLAUDE_CONFIG.model,
            system: prompts.systemInstruction,
            messages: [
                {
                    role: "user",
                    content: prompts.userPrompt
                }
            ],
            max_tokens: 1200
        };
        
        let data;
        
        if (useProxy) {
            // Use proxy function
            data = await callClaudeApiWithProxy(requestData, CLAUDE_API_KEY);
        } else {
            // Direct API call
            const response = await fetch(CLAUDE_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': CLAUDE_CONFIG.apiVersion
                },
                mode: 'cors',
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                // If direct call fails with a network error and proxy is available, try with proxy
                if ((response.status === 0 || response.status === 520) && typeof callClaudeApiWithProxy === 'function') {
                    console.log("Direct API call for summarization failed, trying with proxy...");
                    // Auto-enable proxy for future requests
                    if (typeof toggleClaudeApiProxy === 'function') {
                        toggleClaudeApiProxy(true);
                    }
                    data = await callClaudeApiWithProxy(requestData, CLAUDE_API_KEY);
                } else {
                    // Other API error
                    const errorText = await response.text();
                    throw new Error(`Claude API error: ${response.status} ${errorText}`);
                }
            } else {
                data = await response.json();
            }
        }
        
        const content = data.content && data.content[0] && data.content[0].text;
        
        if (!content) {
            throw new Error("Invalid response from Claude API");
        }
        
        return content;
    } catch (error) {
        console.error("Error calling Claude API for summarization:", error);
        
        // Check if this is a timeout error and we haven't tried the faster model yet
        const isTimeoutError = error.message.includes('timeout') || error.message.includes('Timeout') || 
                              error.message.includes('408') || error.message.includes('timed out');
        
        if (isTimeoutError && requestData.model !== CLAUDE_CONFIG.fallbackModel) {
            console.log("Timeout detected, retrying with faster model:", CLAUDE_CONFIG.fallbackModel);
            
            try {
                // Retry with faster model
                const retryRequestData = {
                    ...requestData,
                    model: CLAUDE_CONFIG.fallbackModel,
                    max_tokens: Math.min(requestData.max_tokens, 800) // Also reduce tokens for speed
                };
                
                let retryData;
                if (useProxy) {
                    retryData = await callClaudeApiWithProxy(retryRequestData, CLAUDE_API_KEY);
                } else {
                    const retryResponse = await fetch(CLAUDE_CONFIG.apiEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': CLAUDE_API_KEY,
                            'anthropic-version': CLAUDE_CONFIG.apiVersion
                        },
                        mode: 'cors',
                        body: JSON.stringify(retryRequestData)
                    });
                    
                    if (!retryResponse.ok) {
                        throw new Error(`Retry failed: ${retryResponse.status}`);
                    }
                    
                    retryData = await retryResponse.json();
                }
                
                const retryContent = retryData.content && retryData.content[0] && retryData.content[0].text;
                if (retryContent) {
                    console.log("Retry with faster model succeeded");
                    return `${retryContent}\n\n*Note: Generated using faster model (${CLAUDE_CONFIG.fallbackModel}) due to timeout with primary model.*`;
                }
            } catch (retryError) {
                console.error("Retry with faster model also failed:", retryError);
            }
        }
        
        // Add suggestion to try proxy if it was a network error
        const useProxy = isClaudeApiProxyEnabled && isClaudeApiProxyEnabled();
        let errorMessage = error.message;
        
        if (!useProxy && (error.message.includes("Failed to fetch") || error.message.includes("NetworkError"))) {
            errorMessage += ". Try enabling the proxy server option.";
        } else if (isTimeoutError) {
            errorMessage += ". The request was too complex. Consider simplifying your query or try again.";
        }
        
        return `Error generating summary: ${errorMessage}`;
    }
}

// Helper function to extract relevant data for summary
function extractSummaryDataFromResults(resultsDiv) {
    const articles = [];
    
    // Extract article information from the DOM
    const articleGroups = resultsDiv.querySelectorAll('.article-group');
    
    // If no articles found, return empty array to properly handle in summarization
    if (!articleGroups || articleGroups.length === 0) {
        return articles;
    }
    
    articleGroups.forEach(group => {
        // Create article object with detailed information
        const article = {
            title: group.querySelector('strong')?.textContent || 'Unknown',
            conditions: [],
            acupoints: [],
            meridians: [],
            special_point_categories: [],
            body_regions: [],
            surface_regions: [],
            authors: group.querySelector('tr:nth-child(1) td:nth-child(3)')?.textContent.trim() || '',
            year: group.querySelector('tr:nth-child(1) td:nth-child(4)')?.textContent.trim() || '',
            country: group.querySelector('tr:nth-child(1) td:nth-child(5)')?.textContent.trim() || '',
            journal: group.querySelector('tr:nth-child(2) td:nth-child(3)')?.textContent.trim() || '',
            methodology: ''
        };
        
        // Extract conditions
        const conditionElements = group.querySelectorAll('td a');
        conditionElements.forEach(el => {
            if (el.textContent) {
                article.conditions.push(el.textContent.trim());
            }
        });
        
        // Extract acupoints
        const acupointElements = group.querySelectorAll('.acupoint-item');
        acupointElements.forEach(el => {
            if (el.textContent) {
                article.acupoints.push(el.textContent.trim());
            }
        });
        
        // Try to extract meridians from the data
        const allText = group.textContent.toLowerCase();
        const commonMeridians = [
            "Lung", "Large Intestine", "Stomach", "Spleen", "Heart", 
            "Small Intestine", "Bladder", "Kidney", "Pericardium", 
            "Triple Energizer", "San Jiao", "Gallbladder", "Liver",
            "LU", "LI", "ST", "SP", "HT", "SI", "BL", "KI", "PC", "TE", "SJ", "GB", "LR"
        ];
        
        // Look for meridian mentions
        commonMeridians.forEach(meridian => {
            if (allText.includes(meridian.toLowerCase())) {
                if (!article.meridians.includes(meridian)) {
                    article.meridians.push(meridian);
                }
            }
        });
        
        // Try to extract special point categories
        const specialPointCategories = [
            "Yuan-Source", "Luo-Connecting", "Xi-Cleft", "Back-Shu", 
            "Front-Mu", "Five-Shu", "Jing-Well", "Ying-Spring", "Shu-Stream", 
            "Jing-River", "He-Sea", "Lower He-Sea", "Hui-Meeting", 
            "Confluent", "Influential", "Window of the Sky", "Eight Convergences"
        ];
        
        specialPointCategories.forEach(category => {
            if (allText.includes(category.toLowerCase())) {
                if (!article.special_point_categories.includes(category)) {
                    article.special_point_categories.push(category);
                }
            }
        });
        
        // Try to extract body regions
        const bodyRegions = [
            "head", "face", "neck", "chest", "abdomen", "back", 
            "upper limb", "arm", "forearm", "hand", "lower limb", 
            "thigh", "leg", "foot", "thorax", "trunk"
        ];
        
        bodyRegions.forEach(region => {
            if (allText.includes(region.toLowerCase())) {
                if (!article.body_regions.includes(region)) {
                    article.body_regions.push(region);
                }
            }
        });
        
        // Try to identify methodology (RCT, case study, etc.)
        if (allText.includes("randomized") || allText.includes("rct")) {
            article.methodology = "Randomized Controlled Trial (RCT)";
        } else if (allText.includes("systematic review")) {
            article.methodology = "Systematic Review";
        } else if (allText.includes("meta-analysis")) {
            article.methodology = "Meta-Analysis";
        } else if (allText.includes("case stud")) {
            article.methodology = "Case Study";
        } else if (allText.includes("clinical trial")) {
            article.methodology = "Clinical Trial";
        } else if (allText.includes("observational")) {
            article.methodology = "Observational Study";
        } else if (allText.includes("cohort study")) {
            article.methodology = "Cohort Study";
        }
        
        articles.push(article);
    });
    
    return articles;
}

// Function to validate the Claude API key
async function validateClaudeApiKey(apiKey) {
    try {
        const testPrompt = "Say hello.";
        
        // Use provided key or the stored one
        const keyToTest = apiKey || CLAUDE_API_KEY;
        
        if (!keyToTest) {
            return {
                valid: false,
                message: "No API key provided"
            };
        }
        
        console.log("Validating Claude API key...");
        console.log(`Using API version: ${CLAUDE_CONFIG.apiVersion}, model: ${CLAUDE_CONFIG.model}`);
        
        // Add CORS headers for debugging
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': keyToTest,
                'anthropic-version': CLAUDE_CONFIG.apiVersion
            },
            mode: 'cors', // Add explicit CORS mode
            body: JSON.stringify({
                model: CLAUDE_CONFIG.model,
                max_tokens: 10,
                messages: [
                    {
                        role: "user",
                        content: testPrompt
                    }
                ]
            })
        };
        
        console.log("Sending API validation request with options:", JSON.stringify({
            url: CLAUDE_CONFIG.apiEndpoint,
            method: fetchOptions.method,
            headers: {
                'Content-Type': fetchOptions.headers['Content-Type'],
                'anthropic-version': fetchOptions.headers['anthropic-version'],
                // Don't log the actual API key
                'x-api-key': 'API_KEY_HIDDEN'
            },
            mode: fetchOptions.mode,
            bodyPreview: "Request body contains model and messages"
        }));
        
        // Check if we should use the proxy directly
        const useProxy = isClaudeApiProxyEnabled && isClaudeApiProxyEnabled();
        let response;
        
        if (useProxy && typeof callClaudeApiWithProxy === 'function') {
            console.log("Using proxy for API validation");
            try {
                // Use proxy for validation
                const validationResult = await validateClaudeApiKeyWithProxy(keyToTest);
                return validationResult;
            } catch (proxyError) {
                console.error("Proxy validation failed, falling back to direct API call:", proxyError);
                // Fall back to direct call
            }
        }
        
        // Make a minimal test request to Claude API directly
        response = await fetch(CLAUDE_CONFIG.apiEndpoint, fetchOptions);
        
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
                
                // Check for specific error types
                if (errorData.error?.type === "authentication_error") {
                    return {
                        valid: false,
                        message: "Invalid API key: Authentication failed",
                        details: errorData
                    };
                } else {
                    return {
                        valid: false,
                        message: `API key validation failed: ${errorData.error?.message || response.statusText}`,
                        details: errorData
                    };
                }
            } catch (jsonError) {
                // If we can't parse the error as JSON
                return {
                    valid: false,
                    message: `API request failed: ${response.status} ${response.statusText}`,
                    status: response.status
                };
            }
            
            // If this is a network/CORS error and we haven't tried proxy yet,
            // try with the proxy if it's available
            if (!useProxy && (response.status === 0 || response.status === 520) && 
                typeof validateClaudeApiKeyWithProxy === 'function') {
                console.log("Direct API validation failed - trying with proxy");
                
                // Auto-enable proxy for future requests
                if (typeof toggleClaudeApiProxy === 'function') {
                    toggleClaudeApiProxy(true);
                    // Update UI as well
                    const proxyButton = document.getElementById('toggle-proxy');
                    if (proxyButton) proxyButton.click();
                }
                
                try {
                    return await validateClaudeApiKeyWithProxy(keyToTest);
                } catch (proxyError) {
                    console.error("Proxy validation also failed:", proxyError);
                    // Keep the original error
                }
            }
        }
    } catch (error) {
        console.error("Network or other error during API validation:", error);
        
        // More detailed error information
        let errorDetails = "Unknown error";
        if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
            errorDetails = `CORS or network issue: ${error.message}. This may be due to:
                1. No internet connection
                2. CORS policy blocking the request
                3. A network firewall or security software
                4. The API endpoint being unreachable`;
                
            // Let's add a useful suggestion
            console.log("Suggestion: Try using a proxy server or server-side API call to avoid CORS issues");
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
window.extractFiltersWithClaude = extractFiltersWithClaude;
window.summarizeResultsWithClaude = summarizeResultsWithClaude;
window.setClaudeApiKey = setClaudeApiKey;
window.validateClaudeApiKey = validateClaudeApiKey;
window.isClaudeApiKeySet = isClaudeApiKeySet;

// Add a check to see if proxy functions are available on window
document.addEventListener('DOMContentLoaded', function() {
    // Verify that proxy-support.js has been properly loaded
    if (typeof isClaudeApiProxyEnabled === 'undefined') {
        console.warn("Proxy support functions not found. Make sure proxy-support.js is loaded.");
    } else {
        console.log("Proxy support is available. Use the 'Use Proxy' button if you experience CORS issues.");
    }
});
