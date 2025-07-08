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
            apiVersion: CLAUDE_CONFIG.apiVersion
        };
        
        const response = await fetch(PROXY_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proxyRequestData)
        });
        
        if (!response.ok) {
            throw new Error(`Proxy server error: ${response.status} ${response.statusText}`);
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
        const keyToTest = apiKey || CLAUDE_API_KEY;
        
        if (!keyToTest) {
            return {
                valid: false,
                message: "No API key provided"
            };
        }
        
        console.log("Validating Claude API key using proxy...");
        
        // Ensure proxy server is running
        try {
            // Quick connection test to proxy server
            const testResponse = await fetch(PROXY_CONFIG.endpoint.replace('/proxy/claude', '/ping'), {
                method: 'GET',
                mode: 'no-cors' // Try to connect even if CORS might block the response
            });
            
            console.log("Proxy server connection test:", testResponse.type === 'opaque' ? "Connection attempt made" : "Connected");
        } catch (connError) {
            console.warn("Proxy server connection test failed:", connError.message);
            return {
                valid: false,
                message: "Proxy server is not running or not accessible",
                details: `Make sure to start the proxy server with "node claude-proxy.js" if you're experiencing CORS issues. Error: ${connError.message}`
            };
        }
        
        const proxyResponse = await callClaudeApiWithProxy({
            model: CLAUDE_CONFIG.model,
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
            errorDetails = "The proxy server is likely not running. Run 'node claude-proxy.js' in a terminal window to start it.";
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
