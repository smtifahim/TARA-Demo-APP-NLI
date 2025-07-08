// Simple proxy server for Claude API to bypass CORS restrictions
// Run with: node claude-proxy.js

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;
const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version');
  
  // Handle pre-flight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Claude proxy server is running' }));
    return;
  }
  
  if (req.method === 'POST' && req.url === '/proxy/claude') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const apiKey = data.apiKey;
        
        // Remove API key from the payload
        delete data.apiKey;
        
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': data.apiVersion || '2023-06-01'
          }
        };
        
        // Remove API version from payload if present
        if (data.apiVersion) {
          delete data.apiVersion;
        }
        
        const claudeReq = https.request(CLAUDE_API_ENDPOINT, options, (claudeRes) => {
          let responseData = '';
          
          claudeRes.on('data', (chunk) => {
            responseData += chunk;
          });
          
          claudeRes.on('end', () => {
            res.writeHead(claudeRes.statusCode, claudeRes.headers);
            res.end(responseData);
          });
        });
        
        claudeReq.on('error', (error) => {
          console.error('Error with Claude API request:', error);
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Error forwarding request to Claude API' }));
        });
        
        claudeReq.write(JSON.stringify(data));
        claudeReq.end();
        
      } catch (error) {
        console.error('Error processing request:', error);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request format' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`
======================================================
🚀 Claude API Proxy Server running at http://localhost:${PORT}
------------------------------------------------------
HEALTH CHECK: http://localhost:${PORT}/ping
API ENDPOINT: http://localhost:${PORT}/proxy/claude
------------------------------------------------------
✓ CORS headers configured - allows requests from any origin
✓ API key securely proxied from client to Claude API
------------------------------------------------------
This proxy helps bypass CORS restrictions when calling 
the Claude API directly from a browser.

To use the proxy:
1. Keep this terminal window open
2. In the TARA application, click "Use Proxy: Off" to enable
3. Enter your Claude API key in the application
4. Your requests will now flow through this proxy server
======================================================
`);
});
