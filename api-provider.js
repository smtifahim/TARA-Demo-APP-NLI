// API Provider Management for TARA Acupuncture Research NLI

// Available API providers
const API_PROVIDERS = {
    CLAUDE: "claude",
    GEMINI: "gemini"
};

// Default provider
let currentProvider = API_PROVIDERS.CLAUDE;

// Store the selected provider in session storage
document.addEventListener('DOMContentLoaded', function() {
    // Load saved provider preference if available
    const savedProvider = sessionStorage.getItem("selected_api_provider");
    if (savedProvider && Object.values(API_PROVIDERS).includes(savedProvider)) {
        currentProvider = savedProvider;
        updateProviderUI();
    }
});

// Helper function to extract relevant data for summary
// Used by both Claude and Gemini summarization functions
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

// Set the current API provider
function setApiProvider(provider) {
    if (Object.values(API_PROVIDERS).includes(provider)) {
        currentProvider = provider;
        sessionStorage.setItem("selected_api_provider", provider);
        updateProviderUI();
        return true;
    }
    return false;
}

// Get the current API provider
function getApiProvider() {
    return currentProvider;
}

// Check if current provider is Claude
function isClaudeProvider() {
    return currentProvider === API_PROVIDERS.CLAUDE;
}

// Check if current provider is Gemini
function isGeminiProvider() {
    return currentProvider === API_PROVIDERS.GEMINI;
}

// Update the UI to reflect the current provider
function updateProviderUI() {
    const providerSelector = document.getElementById('api-provider-selector');
    if (providerSelector) {
        providerSelector.value = currentProvider;
    }
    
    // Update API key status display
    updateApiKeyStatus();
    
    // Update the API key button text
    const apiKeyButton = document.getElementById('set-api-key');
    if (apiKeyButton) {
        const providerName = currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1);
        apiKeyButton.textContent = `Set ${providerName} API Key`;
    }
}

// Function to handle setting an API key based on the current provider
function promptForCurrentApiKey() {
    if (isClaudeProvider()) {
        return promptForApiKey(); // Use the existing Claude function
    } else if (isGeminiProvider()) {
        return promptForGeminiApiKey();
    }
    return false;
}

// Function to check if the current provider's API key is set
function isCurrentApiKeySet() {
    if (isClaudeProvider()) {
        return isClaudeApiKeySet();
    } else if (isGeminiProvider()) {
        return isGeminiApiKeySet();
    }
    return false;
}

// Function to set API key for current provider
function setCurrentApiKey(apiKey) {
    if (isClaudeProvider()) {
        return setClaudeApiKey(apiKey);
    } else if (isGeminiProvider()) {
        return setGeminiApiKey(apiKey);
    }
    return false;
}

// Function to validate current provider's API key
async function validateCurrentApiKey(apiKey) {
    if (isClaudeProvider()) {
        return validateClaudeApiKey(apiKey);
    } else if (isGeminiProvider()) {
        return validateGeminiApiKey(apiKey);
    }
    return { valid: false, message: "Invalid provider selected" };
}

// Extract filters using the current provider
async function extractFiltersWithCurrentProvider(query) {
    if (isClaudeProvider()) {
        return extractFiltersWithClaude(query);
    } else if (isGeminiProvider()) {
        return extractFiltersWithGemini(query);
    }
    throw new Error("No valid API provider selected");
}

// Summarize results using the current provider
async function summarizeResultsWithCurrentProvider(query, results) {
    if (isClaudeProvider()) {
        return summarizeResultsWithClaude(query, results);
    } else if (isGeminiProvider()) {
        return summarizeResultsWithGemini(query, results);
    }
    return "Error: No valid API provider selected";
}

// Update the API key status display based on current provider
function updateApiKeyStatus() {
    const statusElement = document.getElementById('api-status');
    if (!statusElement) return;
    
    if (isCurrentApiKeySet()) {
        const providerName = currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1);
        statusElement.textContent = `✓ ${providerName} API Key`;
        statusElement.style.color = "green";
    } else {
        const providerName = currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1);
        statusElement.textContent = `✗ ${providerName} API key not set`;
        statusElement.style.color = "red";
    }
}

// Make functions available globally
window.API_PROVIDERS = API_PROVIDERS;
window.setApiProvider = setApiProvider;
window.getApiProvider = getApiProvider;
window.isClaudeProvider = isClaudeProvider;
window.isGeminiProvider = isGeminiProvider;
window.promptForCurrentApiKey = promptForCurrentApiKey;
window.isCurrentApiKeySet = isCurrentApiKeySet;
window.setCurrentApiKey = setCurrentApiKey;
window.validateCurrentApiKey = validateCurrentApiKey;
window.extractFiltersWithCurrentProvider = extractFiltersWithCurrentProvider;
window.summarizeResultsWithCurrentProvider = summarizeResultsWithCurrentProvider;
window.updateApiKeyStatus = updateApiKeyStatus;
window.extractSummaryDataFromResults = extractSummaryDataFromResults;
