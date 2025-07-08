// Proxy Support for Claude API Integration
// This file provides functions to handle CORS issues by using a local proxy server

// Proxy configuration
const PROXY_CONFIG = {
    enabled: false, // Default to disabled
    endpoint: "/.netlify/functions/claude-proxy" // Use Netlify function endpoint
};

// Function to toggle proxy usage
function toggleClaudeApiProxy(enable) {
    PROXY_CONFIG.enabled = enable;
    localStorage.setItem("claude_use_proxy", enable ? "true" : "false");
    return PROXY_CONFIG.enabled;
}

// Function to check if proxy is enabled
function isClaudeApiProxyEnabled() {
    return PROXY_CONFIG.enabled;
}

// Load proxy settings from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedSetting = localStorage.getItem("claude_use_proxy");
    if (savedSetting === "true") {
        PROXY_CONFIG.enabled = true;
    }
});

// Function to call Claude API through proxy
async function callClaudeApiWithProxy(requestData, apiKey) {
    try {
        console.log("Using proxy server for Claude API request:", PROXY_CONFIG.endpoint);
        
        // Include API key and API version in the request body for the proxy
        const proxyRequestData = {
            ...requestData,
            apiKey: apiKey,
            apiVersion: (typeof CLAUDE_CONFIG !== 'undefined' && CLAUDE_CONFIG.apiVersion) || "2023-06-01"
        };
        
        console.log("Proxy request data:", {
            model: proxyRequestData.model,
            hasApiKey: !!proxyRequestData.apiKey,
            apiVersion: proxyRequestData.apiVersion,
            messageCount: proxyRequestData.messages?.length
        });
        
        const response = await fetch(PROXY_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proxyRequestData)
        });
        
        if (!response.ok) {
            // Get more detailed error information
            let errorText = `${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorText += ` - ${errorData.error || JSON.stringify(errorData)}`;
            } catch (parseError) {
                const textResponse = await response.text();
                errorText += ` - ${textResponse}`;
            }
            throw new Error(`Proxy server error: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Error using proxy server:", error);
        throw new Error(`Proxy server error: ${error.message}`);
    }
}

// Function to validate API key using proxy
async function validateClaudeApiKeyWithProxy(apiKey) {
    try {
        const testPrompt = "Say hello.";
        
        // If no API key provided, use the stored one
        const keyToTest = apiKey || (typeof CLAUDE_API_KEY !== 'undefined' ? CLAUDE_API_KEY : null);
        
        if (!keyToTest) {
            return {
                valid: false,
                message: "No API key provided"
            };
        }
        
        console.log("Validating Claude API key using proxy...");
        
        // For Netlify deployment, we can optionally test the function endpoint
        try {
            // Test if the Netlify function is accessible
            const testResponse = await fetch(PROXY_CONFIG.endpoint, {
                method: 'GET'
            });
            
            if (testResponse.ok) {
                const healthData = await testResponse.json();
                console.log("Proxy function health check:", healthData.message);
            } else {
                console.warn("Health check failed:", testResponse.status, testResponse.statusText);
            }
        } catch (connError) {
            console.warn("Proxy function health check failed (this may be normal):", connError.message);
            // Continue anyway - the health check failure doesn't necessarily mean the proxy won't work
        }
        
        // Validate that we have an API key
        if (!keyToTest) {
            return {
                valid: false,
                message: "No API key provided for validation"
            };
        }
        
        const proxyResponse = await callClaudeApiWithProxy({
            model: (typeof CLAUDE_CONFIG !== 'undefined' && CLAUDE_CONFIG.model) || "claude-3-opus-20240229",
            max_tokens: 10,
            messages: [
                {
                    role: "user",
                    content: testPrompt
                }
            ]
        }, keyToTest);
        
        return {
            valid: true,
            message: "API key is valid (via proxy)"
        };
    } catch (error) {
        console.error("Error validating API key with proxy:", error);
        
        let errorDetails = "";
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            errorDetails = "Network error when connecting to the proxy function. This could be due to connectivity issues or if the Netlify function is not deployed properly.";
        }
        
        return {
            valid: false,
            message: `Error validating API key with proxy: ${error.message}`,
            details: errorDetails,
            error: error
        };
    }
}

// Export functions to global scope
window.toggleClaudeApiProxy = toggleClaudeApiProxy;
window.isClaudeApiProxyEnabled = isClaudeApiProxyEnabled;
window.callClaudeApiWithProxy = callClaudeApiWithProxy;
window.validateClaudeApiKeyWithProxy = validateClaudeApiKeyWithProxy;
