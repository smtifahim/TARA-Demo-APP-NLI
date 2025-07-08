// Proxy Support for Claude API Integration
// This file provides functions to handle CORS issues by using a local proxy server

// Proxy configuration
const PROXY_CONFIG = {
    enabled: false, // Default to disabled
    endpoint: getProxyEndpoint() // Automatically detect correct endpoint
};

// Function to determine the correct proxy endpoint based on environment
function getProxyEndpoint() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname === '';
    
    if (isLocalhost) {
        // Local development - use local proxy server
        return "http://localhost:3000/proxy/claude";
    } else {
        // Production/Netlify - use Netlify function
        return "/.netlify/functions/claude-proxy";
    }
}

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
    
    // If running locally, check if local proxy is available and suggest enabling it
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname === '';
    
    if (isLocalhost && !PROXY_CONFIG.enabled) {
        console.log("🚀 Running locally detected!");
        console.log("💡 To use Claude API locally, you need to:");
        console.log("   1. Run 'node claude-proxy.js' in terminal");
        console.log("   2. Click 'Use Proxy: Off' to enable proxy");
        console.log("   3. Then set your Claude API key");
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
                if (response.status === 408 || errorData.error === 'Request timeout') {
                    throw new Error(`Timeout: ${errorData.message || 'Request took too long to complete'}`);
                }
                errorText += ` - ${errorData.error || JSON.stringify(errorData)}`;
            } catch (parseError) {
                if (parseError.message.includes('Timeout')) {
                    throw parseError; // Re-throw timeout errors
                }
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
        
        // For local development, test the proxy server specifically
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.hostname === '';
        
        if (isLocalhost) {
            try {
                // Test if local proxy server is running
                const localProxyTest = await fetch('http://localhost:3000/ping', {
                    method: 'GET'
                });
                
                if (localProxyTest.ok) {
                    const healthData = await localProxyTest.json();
                    console.log("Local proxy server health check:", healthData.message);
                } else {
                    console.warn("Local proxy server not responding. Make sure to run 'node claude-proxy.js'");
                }
            } catch (localProxyError) {
                console.warn("Local proxy server not running. Run 'node claude-proxy.js' to start it.");
                return {
                    valid: false,
                    message: "Local proxy server not running",
                    details: "Run 'node claude-proxy.js' in your terminal to start the local proxy server, then try again."
                };
            }
        } else {
            // For Netlify deployment, test the function endpoint
            try {
                const testResponse = await fetch(PROXY_CONFIG.endpoint, {
                    method: 'GET'
                });
                
                if (testResponse.ok) {
                    const healthData = await testResponse.json();
                    console.log("Proxy function health check:", healthData.message);
                }
            } catch (connError) {
                console.warn("Proxy function health check failed (this may be normal):", connError.message);
                // Continue anyway - the health check failure doesn't necessarily mean the proxy won't work
            }
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
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' || 
                               window.location.hostname === '';
            
            if (isLocalhost) {
                errorDetails = "Local development detected. Make sure to run 'node claude-proxy.js' in terminal and enable the proxy in the UI.";
            } else {
                errorDetails = "Network error when connecting to the proxy function. This could be due to connectivity issues or if the Netlify function is not deployed properly.";
            }
        } else if (error.message.includes("Timeout")) {
            errorDetails = "The request timed out. The system will automatically retry with a faster model for complex summarization requests.";
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
