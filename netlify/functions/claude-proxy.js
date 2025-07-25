// Netlify Function to proxy Claude API requests and handle CORS
exports.handler = async (event, context) => {
  // Set a shorter timeout for the function to prevent hanging
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Handle GET requests for health check
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        status: 'ok', 
        message: 'Claude proxy function is running',
        timestamp: new Date().toISOString()
      })
    };
  }

  // Only allow POST requests for actual proxying
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Parse the request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Extract API key and API version from the request
    const { apiKey, apiVersion, ...claudeRequestData } = requestData;
    
    if (!apiKey) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'API key is required' })
      };
    }

    // Basic API key format validation for Claude
    if (!apiKey.startsWith('sk-ant-')) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid API key format. Claude API keys should start with "sk-ant-"' })
      };
    }

    // Validate that we have the required Claude API request structure
    if (!claudeRequestData.model || !claudeRequestData.messages) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Invalid request: model and messages are required',
          received: Object.keys(claudeRequestData)
        })
      };
    }

    console.log('Proxying request to Claude API:', {
      model: claudeRequestData.model,
      messageCount: claudeRequestData.messages?.length,
      hasSystem: !!claudeRequestData.system,
      apiVersion: apiVersion || '2023-06-01',
      hasApiKey: !!apiKey,
      requestSize: JSON.stringify(claudeRequestData).length
    });

    // Estimate request complexity and suggest optimizations for large requests
    const requestSize = JSON.stringify(claudeRequestData).length;
    const maxTokens = claudeRequestData.max_tokens || 1000;
    const isComplexRequest = requestSize > 5000 || maxTokens > 800;
    
    if (isComplexRequest) {
      console.log('Large/complex request detected:', { requestSize, maxTokens });
      // Log suggestion for optimization
      console.log('Consider using claude-3-haiku-20240307 for faster responses on complex requests');
    }

    // Create a timeout promise to prevent hanging (generous timeout for complex requests)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 20 seconds')), 20000);
    });

    // Make the request to Claude API with timeout
    const fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': apiVersion || '2023-06-01'
      },
      body: JSON.stringify(claudeRequestData)
    });

    // Race between the fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    // Get the response data
    const responseData = await response.json();

    // Log response status for debugging
    console.log('Claude API response status:', response.status);
    
    if (!response.ok) {
      console.error('Claude API error:', responseData);
    }

    // Return the response with CORS headers
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Proxy function error:', error);
    
    // Handle timeout errors specifically
    if (error.message.includes('timeout')) {
      return {
        statusCode: 408,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Request timeout',
          message: 'The Claude API request took too long to complete. Try reducing the complexity of your request or use a faster model.',
          details: 'Netlify function timeout after 20 seconds'
        })
      };
    }
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        details: 'Check function logs for more information'
      })
    };
  }
};
