# TARA Article Search Demo Application

A demo article search app for TARA acupuncture research, built using HTML and JavaScript. The app is currently deployed on Netlify.

* Visit the app from [https://tara-demo.netlify.app/](https://tara-demo.netlify.app/)

## API Key Management

This application uses the Claude API for natural language processing. To ensure security:

1. **No API keys are hardcoded** in the application code
2. **Users must enter their own Claude API key** when using the natural language search feature
3. API keys are stored in the browser's session storage only (cleared when the browser is closed)
4. The application **never transmits the API key to any server** except directly to Anthropic's API endpoint

## Troubleshooting Claude API Connectivity

If you encounter "Failed to fetch" errors when validating your API key:

### Option 1: Use the built-in proxy server

1. Click the "Use Proxy: Off" button to toggle it to "On"
2. Try validating your API key again

### Option 2: Run the proxy server manually

1. Make sure Node.js is installed on your system
2. Open a terminal and navigate to the project directory
3. Run the proxy server using one of the following methods:

   **On macOS/Linux:**
   ```bash
   ./start-proxy.sh
   ```
   
   **On Windows:**
   ```
   start-proxy.bat
   ```
   
   **Or directly with Node.js:**
   ```
   node claude-proxy.js
   ```

4. You should see a message confirming the proxy server is running
5. In the application, click "Use Proxy: Off" to enable proxy mode
6. Try validating your API key again
7. Keep the terminal window open while you use the application

## API Configuration

The application is configured to use the following Claude API settings:

- API Version: `2023-06-01`
- Model: `claude-3-opus-20240229`

If you need to use a different API version or model, you can modify these settings in `claude-integration.js`.

### Security Recommendations

If you're extending this application:
- For a production environment, consider implementing a server-side proxy to handle API calls to Claude
- Never commit API keys to version control
- Use environment variables for server-side applications

## JSON Data Loader

After a new release of the TARA Acupoints ontology, run the Python script at `json-data-loader/tara-data-loader.py`. This script executes a set of SPARQL queries (located in `json-data-loader/sparql-queries`) against the Stardog endpoint and saves the query results as corresponding JSON files required for the TARA Article Search application.  

### Sample Execution

```
json-data-loader % python tara-data-loader.py

Program execution started...

Step 0: Checking Stardog server status..
        Server Status: Stardog server is running and able to accept traffic.
Step 0: Done!

Step 1: Executing query from: ./sparql-queries/article-data.rq
        Saving query results...
        Query results saved to: ../json/article-data.json
Step 1: Done!

Step 2: Executing query from: ./sparql-queries/acupoints-synonyms.rq
        Saving query results...
        Query results saved to: ../json/acupoints-synonyms.json
Step 2: Done!

Step 3: Executing query from: ./sparql-queries/meridians-synonyms.rq
        Saving query results...
        Query results saved to: ../json/meridians-synonyms.json
Step 3: Done!

Step 4: Executing query from: ./sparql-queries/anatomical-synonyms.rq
        Saving query results...
        Query results saved to: ../json/anatomical-synonyms.json
Step 4: Done!

Step 5: Executing query from: ./sparql-queries/body-regions-synonyms.rq
        Saving query results...
        Query results saved to: ../json/body-regions-synonyms.json
Step 5: Done!

Step 6: Executing query from: ./sparql-queries/conditions-synonyms.rq
        Saving query results...
        Query results saved to: ../json/conditions-synonyms.json
Step 6: Done!

All queries executed and results are saved successfully!
```
