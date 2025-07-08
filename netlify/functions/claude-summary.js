// Optimized Netlify Function specifically for Claude summarization with faster processing
exports.handler = async (event, context) => {
  // Optimize for faster execution
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

  // Only allow POST requests
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

    // Extract API key from the request
    const { apiKey, ...claudeRequestData } = requestData;
    
    if (!apiKey) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'API key is required' })
      };
    }

    // Force use of faster model for summaries
    claudeRequestData.model = "claude-3-haiku-20240307";
    
    // Limit max tokens for faster response
    claudeRequestData.max_tokens = Math.min(claudeRequestData.max_tokens || 800, 800);

    console.log('Fast summary request to Claude API:', {
      model: claudeRequestData.model,
      messageCount: claudeRequestData.messages?.length,
      maxTokens: claudeRequestData.max_tokens
    });

    // Shorter timeout for faster model
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Summary timeout after 15 seconds')), 15000);
    });

    // Make the request to Claude API with timeout
    const fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeRequestData)
    });

    // Race between the fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    // Get the response data
    const responseData = await response.json();

    // Log response status for debugging
    console.log('Claude API summary response status:', response.status);
    
    if (!response.ok) {
      console.error('Claude API summary error:', responseData);
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
    console.error('Summary function error:', error);
    
    // Handle timeout errors specifically
    if (error.message.includes('timeout')) {
      return {
        statusCode: 408,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Summary timeout',
          message: 'The summary request took too long. Try with fewer results or a simpler query.',
          details: 'Fast summary function timeout after 15 seconds'
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
