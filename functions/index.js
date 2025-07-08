/**
 * Firebase Functions for TARA Demo APP NLI
 * Claude API Proxy Function
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Claude API proxy function for Firebase Functions
exports.claudeProxy = onRequest({
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5000", 
      "https://tara-demo-app-nli.web.app",
      "https://tara-demo-app-nli.firebaseapp.com"
    ],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  region: "us-central1"
}, async (req, res) => {
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", req.get("Origin"));
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    logger.warn("Invalid method:", req.method);
    res.status(405).json({
      error: "Method not allowed",
      message: "Only POST requests are supported"
    });
    return;
  }

  try {
    logger.info("Received Claude API proxy request");
    
    // Extract request data
    const requestData = req.body;
    
    // Validate required fields
    if (!requestData || !requestData.apiKey) {
      logger.warn("Missing API key in request");
      res.status(400).json({
        error: "Bad Request",
        message: "API key is required"
      });
      return;
    }

    if (!requestData.model || !requestData.messages) {
      logger.warn("Missing required fields in request");
      res.status(400).json({
        error: "Bad Request", 
        message: "Model and messages are required"
      });
      return;
    }

    // Prepare Claude API request
    const claudeRequest = {
      model: requestData.model,
      messages: requestData.messages,
      max_tokens: requestData.max_tokens || 1000,
      system: requestData.system
    };

    // Remove API key from logged data for security
    const logData = {
      model: requestData.model,
      messageCount: requestData.messages?.length,
      apiVersion: requestData.apiVersion
    };
    logger.info("Proxying request to Claude API:", logData);

    // Make request to Claude API
    const fetch = (await import('node-fetch')).default;
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": requestData.apiKey,
        "anthropic-version": requestData.apiVersion || "2023-06-01"
      },
      body: JSON.stringify(claudeRequest)
    });

    // Check if Claude API request was successful
    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      logger.error("Claude API error:", {
        status: claudeResponse.status,
        statusText: claudeResponse.statusText,
        error: errorText
      });
      
      res.status(claudeResponse.status).json({
        error: "Claude API Error",
        message: `Claude API returned ${claudeResponse.status}: ${claudeResponse.statusText}`,
        details: errorText
      });
      return;
    }

    // Parse and forward Claude API response
    const claudeData = await claudeResponse.json();
    logger.info("Successfully proxied Claude API request");
    
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", req.get("Origin"));
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    // Return Claude API response
    res.status(200).json(claudeData);

  } catch (error) {
    logger.error("Error in Claude proxy function:", error);
    
    // Handle network timeouts
    if (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
      res.status(504).json({
        error: "Gateway Timeout",
        message: "Unable to reach Claude API. Please try again.",
        code: error.code
      });
      return;
    }

    // Handle other errors
    res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while processing your request",
      details: error.message
    });
  }
});
