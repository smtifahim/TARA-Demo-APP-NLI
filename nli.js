// Natural Language Interface for TARA acupoint research search
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners after the DOM is fully loaded
    setupNLInterface();
    setupNLAutocomplete();
    
    // Store and override the default search function to check for NL queries
    window.originalSearch = window.search;
    window.search = function() {
        const nlInput = document.getElementById('nl-search-input');
        if (nlInput && nlInput.value.trim() !== '') {
            processNaturalLanguageQuery(nlInput.value);
        } else {
            // If no NL query, use the original search
            if (typeof window.originalSearch === 'function') {
                window.originalSearch();
            } else {
                console.warn('Original search function not found, using direct form submission');
                // Default search behavior
                const resultsDiv = document.getElementById('results');
                fetchAndDisplayResults(resultsDiv);
            }
        }
    };
});

function setupNLInterface() {
    // Add event listeners for example queries
    const examples = document.querySelectorAll('.nl-example');
    examples.forEach(example => {
        example.addEventListener('click', function(e) {
            e.preventDefault();
            const query = this.textContent;
            document.getElementById('nl-search-input').value = query;
            // Don't auto-search, let user click the search button
        });
    });
    
    // Add event listener for Enter key in search input
    const searchInput = document.getElementById('nl-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Trigger the search button click
                document.getElementById('search-button').click();
            }
        });
    }
}

// Setup autocomplete for natural language search input
function setupNLAutocomplete() {
    const nlInput = document.getElementById('nl-search-input');
    if (nlInput) {
        // Update suggestions on input
        nlInput.addEventListener('input', function() {
            handleNLAutocomplete(this);
        });
        
        // Show suggestions when focusing on the field (if there's text)
        nlInput.addEventListener('focus', function() {
            if (this.value.trim().length > 0) {
                handleNLAutocomplete(this);
            }
        });
        
        // Update on key release for better responsiveness
        nlInput.addEventListener('keyup', function() {
            handleNLAutocomplete(this);
        });
    }
}

// Handle autocomplete for natural language input
function handleNLAutocomplete(input) {
    const val = input.value.toLowerCase();
    
    // Clear previous suggestions
    const existingList = document.getElementById('nl-autocomplete-list');
    if (existingList) {
        existingList.remove();
    }
    
    if (!val) return; // No suggestions for empty input
    
    // Create suggestions container
    const searchRow = document.querySelector('.search-row');
    const suggestionsList = document.createElement('div');
    suggestionsList.setAttribute('id', 'nl-autocomplete-list');
    suggestionsList.setAttribute('class', 'autocomplete-items');
    searchRow.appendChild(suggestionsList);
    
    // Get the word at the cursor position
    const words = val.split(/\s+/);
    const lastWord = words[words.length - 1];
    
    // Only do autocomplete if the last word is at least 1 character (more responsive)
    if (lastWord.length < 3) return;
    
    // Get unique values for all available fields to suggest
    const acupointValues = getUniqueValues('Acupoint');
    const meridianValues = getUniqueValues('Meridian');
    const conditionValues = getUniqueValues('Studied_Condition');
    const countryValues = getUniqueValues('Country');
    const specialPointValues = getUniqueValues('Special_Point_Category');
    const surfaceRegionValues = getUniqueValues('Surface_Region');
    const relatedRegionValues = getUniqueValues('Related_Region');
    const bodyRegionValues = getUniqueValues('Body_Region');
    const conditionContextValues = getUniqueValues('Condition_Context');
    
    // Combine all suggestion sources
    const allSuggestions = [
        ...acupointValues.map(v => ({ value: v, type: 'Acupoint' })),
        ...meridianValues.map(v => ({ value: v, type: 'Meridian' })),
        ...conditionValues.map(v => ({ value: v, type: 'Condition' })),
        ...countryValues.map(v => ({ value: v, type: 'Country' })),
        ...specialPointValues.map(v => ({ value: v, type: 'Special Point' })),
        ...surfaceRegionValues.map(v => ({ value: v, type: 'Surface Region' })),
        ...relatedRegionValues.map(v => ({ value: v, type: 'Related Region' })),
        ...bodyRegionValues.map(v => ({ value: v, type: 'Body Region' })),
        ...conditionContextValues.map(v => ({ value: v, type: 'Context' }))
    ];
    
    // Filter matching values that include the last word (not just starting with it)
    const matchingValues = allSuggestions.filter(item => 
        item.value.toLowerCase().includes(lastWord)
    ).slice(0, 10); // Limit to 10 suggestions
    
    // If no matches, don't show the dropdown
    if (matchingValues.length === 0) {
        return;
    }
    
    let currentFocus = -1;

    // Create suggestion elements
    matchingValues.forEach((item, index) => {
        const suggestionElement = document.createElement('div');
        
        // Get the position of the match
        const matchIndex = item.value.toLowerCase().indexOf(lastWord);
        suggestionElement.innerHTML = item.value.substring(0, matchIndex) + 
                    '<strong>' + item.value.substring(matchIndex, matchIndex + lastWord.length) + '</strong>' +
                    item.value.substring(matchIndex + lastWord.length) + 
                    ` <span class="suggestion-type">(${item.type})</span>`;
        
        suggestionElement.addEventListener('click', function() {
            // Replace just the last word with the suggested value
            const beforeLastWord = words.slice(0, -1).join(' ');
            input.value = beforeLastWord + (beforeLastWord ? ' ' : '') + item.value;
            input.focus(); // Keep focus on the input field
            closeAllLists();
        });

        suggestionElement.addEventListener('mouseover', function() {
            currentFocus = index;
            updateActiveItems(suggestionsList, currentFocus);
        });

        suggestionsList.appendChild(suggestionElement);
    });
    
    // Close autocomplete when clicking elsewhere
    document.addEventListener("click", function(e) {
        closeAllLists(e.target);
    });

    // Add keyboard navigation: Up, Down, Tab, Enter arrows
    input.addEventListener('keydown', function(e) {
        const items = suggestionsList.getElementsByTagName('div');
        if (items.length === 0) return; // Ensure items exist before accessing them

        if (e.key === 'ArrowDown') {
            e.preventDefault(); // Prevent cursor movement within input field
            currentFocus = (currentFocus + 1) % items.length;
            updateActiveItems(suggestionsList, currentFocus);
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault(); // Prevent cursor movement within input field
            currentFocus = (currentFocus - 1 + items.length) % items.length;
            updateActiveItems(suggestionsList, currentFocus);
        } 
        else if ((e.key === 'Enter' || e.key === 'Tab') && currentFocus > -1 && items[currentFocus]) {
            e.preventDefault(); // Prevent form submission or tabbing
            
            // Get the selected value
            const selectedValue = items[currentFocus].textContent.replace(/\([^)]*\)$/, '').trim();
            
            // Replace just the last word with the selected value
            const beforeLastWord = words.slice(0, -1).join(' ');
            input.value = beforeLastWord + (beforeLastWord ? ' ' : '') + selectedValue;
            closeAllLists();
            
            // Don't trigger search on autocomplete selection
            return false;
        }
    });

    // Helper function to update active class for navigation
    function updateActiveItems(list, focusIndex) {
        const items = list.getElementsByTagName('div');
        if (!items.length) return;

        Array.from(items).forEach(item => item.classList.remove('autocomplete-active'));

        if (focusIndex >= 0 && focusIndex < items.length) {
            items[focusIndex].classList.add('autocomplete-active');
            // Ensure the active item is visible within the scrollable container
            items[focusIndex].scrollIntoView({ block: 'nearest' });
        }
    }
}

// Function to get unique values for autocomplete suggestions
function getUniqueValues(type) {
    let values = [];
    
    switch(type) {
        case 'Acupoint':
            if (window.acupointSynonyms) {
                values = window.acupointSynonyms.map(item => item.label ? item.label.value : '').filter(Boolean);
            } else {
                // Fallback common acupoints
                values = ["LI4", "ST36", "LV3", "SP6", "GB34", "PC6", "HT7", "KI3"];
            }
            break;
        case 'Meridian':
            if (window.meridianSynonyms) {
                values = window.meridianSynonyms.map(item => item.label ? item.label.value : '').filter(Boolean);
            } else {
                // Fallback common meridians
                values = ["Lung", "Large Intestine", "Stomach", "Spleen", "Heart", "Small Intestine", 
                          "Bladder", "Kidney", "Pericardium", "Triple Energizer", "Gallbladder", "Liver"];
            }
            break;
        case 'Studied_Condition':
            if (window.conditionSynonyms) {
                values = window.conditionSynonyms.map(item => item.label ? item.label.value : '').filter(Boolean);
            } else {
                // Fallback common conditions
                values = ["lower back pain", "headache", "migraine", "anxiety", "depression", 
                          "insomnia", "digestive disorders", "nausea", "pain", "hypertension"];
            }
            break;
        case 'Country':
            // Extract unique countries from the sparql data
            if (window.sparqlData) {
                const countries = window.sparqlData
                    .map(item => item.country && item.country.value ? item.country.value : '')
                    .filter(Boolean);
                values = [...new Set(countries)];
            } else {
                // Fallback common countries
                values = ["China", "United States", "Korea", "Japan", "Germany", "Australia"];
            }
            break;
        case 'Special_Point_Category':
            // Extract from available data or use common categories
            if (window.sparqlData) {
                const categories = window.sparqlData
                    .map(item => item.special_point_category && item.special_point_category.value ? item.special_point_category.value : '')
                    .filter(Boolean);
                values = [...new Set(categories)];
            } else {
                // Fallback common special point categories
                values = ["Yuan-Source Point", "Luo-Connecting Point", "Xi-Cleft Point", "Back-Shu Point", 
                          "Front-Mu Point", "Five-Shu Point", "Jing-Well Point", "Ying-Spring Point", 
                          "Shu-Stream Point", "Jing-River Point", "He-Sea Point", "Lower He-Sea Point"];
            }
            break;
        case 'Surface_Region':
            // Extract from available data or use common surface regions
            if (window.sparqlData) {
                const regions = window.sparqlData
                    .map(item => item.surface_region && item.surface_region.value ? item.surface_region.value : '')
                    .filter(Boolean);
                values = [...new Set(regions)];
            } else {
                // Fallback common surface regions
                values = ["head", "face", "neck", "chest", "abdomen", "back", "forearm", "arm", 
                          "hand", "thigh", "leg", "foot", "shoulder", "knee", "ankle"];
            }
            break;
        case 'Related_Region':
            // Extract from available data or use common related regions
            if (window.sparqlData) {
                const regions = window.sparqlData
                    .map(item => item.related_region && item.related_region.value ? item.related_region.value : '')
                    .filter(Boolean);
                values = [...new Set(regions)];
            } else {
                // Fallback common related regions
                values = ["metacarpal", "fibula", "tibialis anterior", "dorsum of hand", "lower back", 
                          "cervical spine", "lumbar spine", "facial region", "temporal region"];
            }
            break;
        case 'Body_Region':
            // Extract from available data or use common body regions
            if (window.sparqlData) {
                const regions = window.sparqlData
                    .map(item => item.body_region && item.body_region.value ? item.body_region.value : '')
                    .filter(Boolean);
                values = [...new Set(regions)];
            } else {
                // Fallback common body regions
                values = ["head", "neck", "trunk", "upper limb segment", "lower limb segment", 
                          "thorax", "abdomen", "pelvis", "upper extremity", "lower extremity"];
            }
            break;
        case 'Condition_Context':
            // Extract from available data or use common condition contexts
            if (window.sparqlData) {
                const contexts = window.sparqlData
                    .map(item => item.condition_context && item.condition_context.value ? item.condition_context.value : '')
                    .filter(Boolean);
                values = [...new Set(contexts)];
            } else {
                // Fallback common condition contexts
                values = ["Pain", "Addiction", "Mental Health", "Digestive", "Respiratory", 
                          "Cardiovascular", "Neurological", "Musculoskeletal", "Immune System"];
            }
            break;
        default:
            values = [];
    }
    
    // Return unique values
    return [...new Set(values)];
}

// Close all autocomplete lists except the one passed as an argument
function closeAllLists(elmnt) {
    const items = document.getElementsByClassName("autocomplete-items");
    for (let i = 0; i < items.length; i++) {
        if (elmnt !== items[i] && elmnt !== document.getElementById('nl-search-input')) {
            items[i].parentNode.removeChild(items[i]);
            i--; // Adjust index after removal
        }
    }
    
    // Also remove any specific nl-autocomplete-list elements
    const nlList = document.getElementById('nl-autocomplete-list');
    if (nlList && elmnt !== nlList && elmnt !== document.getElementById('nl-search-input')) {
        nlList.parentNode.removeChild(nlList);
    }
}

// Process the natural language query
async function processNaturalLanguageQuery(query) {
    if (!query || query.trim() === '') {
        return; // Just do nothing if no query
    }
    
    // Clear all form fields first
    resetFormFields();
    
    // Show loading indicator
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<p>Analyzing your question...</p>';
    }
    
    try {
        // Extract search filters from natural language query using current provider
        const filters = await extractFiltersWithCurrentProvider(query);
        
        // Check if we got any filters
        if (Object.keys(filters).length === 0) {
            console.warn("No filters extracted from the query:", query);
            resultsDiv.innerHTML = '<p>I couldn\'t determine what you\'re looking for. Please try a more specific question or use the search fields directly.</p>';
            return;
        }
        
        // Keep a copy of the original filters for reference
        const originalFilters = {...filters};
        console.log("Original filters:", originalFilters);
        
        // Apply filters to the form
        applyFiltersToForm(filters);
        
        // Get the important parts of the query for a fallback search
        const keyTerms = query.toLowerCase().replace(/find|show|research|articles|studies|about|me|using|for|on|with|in/g, ' ').trim();
        console.log("Key terms extracted:", keyTerms);
        
        // Execute the search using the original search function from script.js
        if (typeof window.originalSearch === 'function') {
            window.originalSearch(); // Call the original search function
            
            // Check for zero results after a short delay
            setTimeout(() => {
                checkForZeroResults(resultsDiv, originalFilters, query, keyTerms);
            }, 300);
        } else {
            // Fallback to direct search implementation
            const searchButton = document.getElementById('search-button');
            if (searchButton) {
                // Trigger a click on the search button to use its onclick handler
                searchButton.click();
                
                // Check for zero results after a short delay
                setTimeout(() => {
                    checkForZeroResults(resultsDiv, originalFilters, query, keyTerms);
                }, 300);
            } else {
                console.error('Search function not found');
                resultsDiv.innerHTML = '<p>Error: Search function not available</p>';
                return;
            }
        }
        
        // Add summary based on query if needed
        if (shouldProvideSummary(query)) {
            setTimeout(async () => {
                await addSummaryToResults(query);
            }, 500); // Add delay to ensure search results are populated
        }
    } catch (error) {
        console.error('Error processing natural language query:', error);
        resultsDiv.innerHTML = `<p>Error processing your question: ${error.message}</p>`;
    }
}

// Apply the extracted filters to the search form
function applyFiltersToForm(filters) {
    const fieldMapping = {
        acupoint: 'acupoint',
        meridian: 'meridian',
        special_point_category: 'special_point_category',
        surface_region: 'surface_region',
        related_region: 'related_region',
        body_region: 'body_region',
        studied_condition: 'studied_condition',
        condition_context: 'condition_context',
        country: 'country'
    };
    
    // Make a copy of the original filters
    const originalFilters = {...filters};
    
    // Apply all extracted filters without any prioritization
    const filterCount = Object.keys(filters).length;
    console.log(`Applying ${filterCount} filters:`, filters);
    
    // Apply the filters to the form
    Object.keys(filters).forEach(key => {
        const formFieldId = fieldMapping[key];
        if (formFieldId) {
            const value = filters[key];
            if (value) {
                const input = document.getElementById(formFieldId);
                if (input) {
                    input.value = value;
                    console.log(`Applied filter: ${key} = ${value}`);
                }
            }
        }
    });
}

// Determine if we should provide a summary based on the query
function shouldProvideSummary(query) {
    const normalizedQuery = query.toLowerCase();
    return normalizedQuery.includes('summarize') || 
           normalizedQuery.includes('summary') ||
           normalizedQuery.includes('overview') ||
           normalizedQuery.includes('explain') ||
           normalizedQuery.includes('tell me about');
}

// Add a summary to the search results using the selected provider
async function addSummaryToResults(query) {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    // Get the current search results
    const articleGroups = resultsDiv.querySelectorAll('.article-group');
    if (articleGroups.length === 0) return;
    
    // Get the current provider name for the message
    const providerName = isClaudeProvider() ? 'Claude' : 'Gemini';
    
    // Create the summary container
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'search-summary nl-summary';
    summaryDiv.innerHTML = `<h3>Generating summary with ${providerName}...</h3>`;
    
    // Add to the top of results
    resultsDiv.insertBefore(summaryDiv, resultsDiv.firstChild);
    
    try {
        // Use the current provider to generate the summary
        const summaryText = await summarizeResultsWithCurrentProvider(query, resultsDiv);
        
        // Process the summary text with different approaches based on provider
        let processedSummary;
        
        if (isGeminiProvider()) {
            // Enhanced formatting specifically for Gemini's output
            processedSummary = summaryText
                // Convert markdown headings to HTML (support both ## and ### heading styles)
                // Use a more aggressive pattern for Gemini's output format
                .replace(/##\s+(.*?)(?:\n|$)/g, '<h2>$1</h2>\n')
                .replace(/###\s+(.*?)(?:\n|$)/g, '<h3>$1</h3>\n');
                
            // Special handling for "Most Common Acupoints" section to make it more compact
            if (processedSummary.includes('<h2>Most Common Acupoints</h2>')) {
                // Split the content into sections by h2 headers
                const sections = processedSummary.split(/<h2>(.*?)<\/h2>/);
                
                for (let i = 0; i < sections.length; i++) {
                    // If this is the "Most Common Acupoints" section content
                    if (i > 0 && sections[i-1] === "Most Common Acupoints") {
                        const acupointSection = sections[i];
                        
                        // Process the acupoint section for better formatting
                        let processed = acupointSection
                            // Replace newlines in bullet points for more compact display
                            .replace(/\n\s*-\s+(.*?)(?:\n|$)/g, (match, bulletContent) => {
                                // Make the content more compact by replacing internal line breaks with inline formatting
                                let condensed = bulletContent
                                    // Replace "Conditions:" with bold inline text
                                    .replace(/\s*Conditions:\s*/, " <strong>Conditions:</strong> ")
                                    // Replace "Location:" with bold inline text
                                    .replace(/\s*Location:\s*/, " <strong>Location:</strong> ")
                                    // Replace "Studies:" with bold inline text
                                    .replace(/\s*Studies:\s*/, " <strong>Studies:</strong> ")
                                    // Replace "Point Category:" with bold inline text
                                    .replace(/\s*Point Category:\s*/, " <strong>Category:</strong> ")
                                    // Remove any double spaces that might have been created
                                    .replace(/\s{2,}/g, " ");
                                
                                return `<li>${condensed}</li>\n`;
                            });
                        
                        // Update this section in the array
                        sections[i] = processed;
                    }
                }
                
                // Rejoin the sections with h2 headers
                processedSummary = '';
                for (let i = 0; i < sections.length; i++) {
                    if (i % 2 === 0) {
                        processedSummary += sections[i];
                    } else {
                        processedSummary += `<h2>${sections[i]}</h2>`;
                    }
                }
            }
            
            // Handle bullet points that might be formatted differently
            // First pass: normalize all bullet point formats (*, -, •) with different spacing
            processedSummary = processedSummary
                .replace(/\n\s*[*•-]\s+(.*?)(?:\n|$)/g, (match, content) => {
                    // Skip if this already contains HTML (which would mean it was processed above)
                    if (content.includes('<strong>') || content.includes('<li>')) {
                        return match;
                    }
                    return `\n- ${content}\n`;
                });
            
            // Second pass: handle multi-line bullet points (lines continuing after a bullet point)
            // This captures content that should be part of the previous bullet but isn't properly formatted
            let bulletPointLines = processedSummary.split('\n');
            for (let i = 1; i < bulletPointLines.length; i++) {
                // If current line isn't a bullet point and previous line was a bullet point
                // and current line isn't empty and doesn't start with HTML
                const currentLine = bulletPointLines[i].trim();
                const prevLine = bulletPointLines[i-1].trim();
                
                if (!currentLine.match(/^\s*[*•-]/) && 
                    prevLine.match(/^\s*[*•-]/) && 
                    currentLine && 
                    !currentLine.startsWith('<') &&
                    !prevLine.endsWith('</li>')) {
                    // Append this line to the previous bullet point
                    bulletPointLines[i-1] = bulletPointLines[i-1] + ' ' + currentLine;
                    bulletPointLines[i] = ''; // Remove the current line after appending
                }
            }
            processedSummary = bulletPointLines.filter(line => line.trim()).join('\n');
            
            // Third pass: convert all normalized bullet points to HTML list items
            processedSummary = processedSummary
                .replace(/\n\s*[-–—•*]\s+(.*?)(?:\n|$)/g, (match, content) => {
                    // Skip if this already contains HTML (which would mean it was processed above)
                    if (content.includes('<strong>') || content.includes('<li>')) {
                        return match;
                    }
                    // Clean up any internal line breaks or extra whitespace
                    const cleanContent = content.replace(/\s{2,}/g, ' ').trim();
                    return `<li>${cleanContent}</li>\n`;
                });
                
            // Fourth pass: wrap consecutive list items in <ul> tags
            processedSummary = processedSummary.replace(/(<li>.*?<\/li>\n)+/gs, '<ul>$&</ul>');
            
            // Handle paragraphs - Gemini often has different paragraph spacing
            const paragraphs = processedSummary.split(/\n\s*\n+/);
            processedSummary = paragraphs
                .map(para => {
                    para = para.trim();
                    // Skip wrapping if already has HTML tags
                    if (para.startsWith('<') && (
                        para.startsWith('<h2>') || 
                        para.startsWith('<h3>') || 
                        para.startsWith('<ul>') || 
                        para.startsWith('<li>')
                    )) {
                        return para;
                    }
                    // Skip empty paragraphs
                    if (!para) return '';
                    // Wrap in paragraph tags
                    return `<p>${para}</p>`;
                })
                .filter(Boolean) // Remove empty paragraphs
                .join('\n\n');
        } else {
            // Original Claude formatting logic
            processedSummary = summaryText
                // Convert markdown headings to HTML
                .replace(/##\s+(.*?)(\n|$)/g, '<h2>$1</h2>')
                .replace(/###\s+(.*?)(\n|$)/g, '<h3>$1</h3>')
                // Convert bullet points to HTML lists
                .replace(/\n\s*-\s+(.*?)(?=\n\s*(?:-|[^-])|$)/g, '<li>$1</li>')
                // Wrap consecutive bullet points in <ul> tags
                .replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
            
            // Handle paragraphs
            processedSummary = processedSummary
                // Split by double newlines to identify paragraphs
                .split(/\n\n+/)
                // Wrap each paragraph in <p> tags, but skip those already with HTML tags
                .map(para => {
                    // Skip paragraphs that already have HTML tags
                    if (para.trim().startsWith('<')) return para;
                    return `<p>${para.trim()}</p>`;
                })
                .join('\n\n');
        }
        
        // Fix nested tags for both providers - make sure we don't have <p> tags around <h2> or <ul> elements
        processedSummary = processedSummary
            .replace(/<p>\s*<h2>/g, '<h2>')
            .replace(/<\/h2>\s*<\/p>/g, '</h2>')
            .replace(/<p>\s*<h3>/g, '<h3>')
            .replace(/<\/h3>\s*<\/p>/g, '</h3>')
            .replace(/<p>\s*<ul>/g, '<ul>')
            .replace(/<\/ul>\s*<\/p>/g, '</ul>');
        
        // Update the summary container with the processed response
        summaryDiv.innerHTML = `
            <h3>Research Summary</h3>
            <div class="summary-content compact-lists">${processedSummary}</div>
        `;
        
        // Enhanced post-processing for better bullet point handling and consistent formatting
        setTimeout(() => {
            const content = summaryDiv.querySelector('.summary-content');
            if (!content) return;
            
            // First, perform a pre-processing step for direct text nodes in the content div
            // This is critical for catching those dash-prefixed lines that aren't in paragraphs
            Array.from(content.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    if (text && text.match(/^[-–—•*]/)) {
                        // Create proper list from this text
                        const lines = text.split('\n');
                        const ul = document.createElement('ul');
                        
                        lines.forEach(line => {
                            if (line.trim() && line.trim().match(/^[-–—•*]/)) {
                                const li = document.createElement('li');
                                li.textContent = line.trim().replace(/^[-–—•*]\s*/, '');
                                ul.appendChild(li);
                            }
                        });
                        
                        if (ul.children.length > 0) {
                            node.parentNode.replaceChild(ul, node);
                        }
                    }
                }
            });
            
            // Use our specialized cleaner to handle any text nodes with dash prefixes
            // This is particularly important for Gemini's output format
            if (typeof window.cleanDashPrefixedText === 'function') {
                window.cleanDashPrefixedText(content);
            }
            
            // Process sections and add appropriate classes
            const h2Elements = content.querySelectorAll('h2');
            h2Elements.forEach(h2 => {
                // Find the next ul after this h2
                let nextUl = h2;
                while (nextUl && nextUl.tagName !== 'UL') {
                    nextUl = nextUl.nextElementSibling;
                    // Break if we reach another h2
                    if (nextUl && nextUl.tagName === 'H2') {
                        nextUl = null;
                        break;
                    }
                }
                
                if (nextUl) {
                    // Add appropriate class based on section header
                    if (h2.textContent.includes('Most Common Acupoints')) {
                        nextUl.classList.add('acupoints-section');
                    }
                    
                    // Process all list items for consistent formatting
                    Array.from(nextUl.children).forEach(li => {
                        // If the list item starts with a dash, clean it up
                        if (li.textContent.trim().startsWith('-')) {
                            li.textContent = li.textContent.trim().substring(1).trim();
                        }
                    });
                }
            });
            
            // Find any paragraphs that start with dashes and convert them to proper list items
            const allElements = content.querySelectorAll('*');
            allElements.forEach(element => {
                // Check paragraphs for bullet-like text
                if (element.tagName === 'P') {
                    const text = element.textContent.trim();
                    // Look for any dash-like character at the start of text (including em dash, en dash, hyphen)
                    if (text.match(/^[-–—•*]/)) {
                        const newContent = text.replace(/^[-–—•*]\s*/, ''); // Remove any dash character and following spaces
                        const li = document.createElement('li');
                        li.textContent = newContent;
                        const ul = document.createElement('ul');
                        ul.appendChild(li);
                        element.parentNode.replaceChild(ul, element);
                    }
                }
                
                // Also check for any text content that might be partially formatted
                if (element.childNodes && element.childNodes.length > 0) {
                    element.childNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                            const lines = node.textContent.split('\n');
                            let hasBulletPoints = false;
                            
                            // Check each line for bullet point format - match any dash-like character
                            lines.forEach(line => {
                                if (line.trim().match(/^[-–—•*]/)) {
                                    hasBulletPoints = true;
                                }
                            });
                            
                            // If we found bullet points, convert the text to a proper list
                            if (hasBulletPoints) {
                                const ul = document.createElement('ul');
                                lines.forEach(line => {
                                    const trimmed = line.trim();
                                    if (trimmed.match(/^[-–—•*]/)) {
                                        const li = document.createElement('li');
                                        li.textContent = trimmed.replace(/^[-–—•*]\s*/, ''); // Remove any dash character and spaces
                                        ul.appendChild(li);
                                    } else if (trimmed && ul.lastChild) {
                                        // If this is a continuation line (not empty, not a bullet point),
                                        // append it to the previous list item
                                        const lastLi = ul.lastChild;
                                        lastLi.textContent += ' ' + trimmed;
                                    }
                                });
                                
                                if (ul.children.length > 0) {
                                    node.parentNode.replaceChild(ul, node);
                                }
                            }
                        }
                    });
                }
            });
            
            // Ensure all raw bullet points within list items are properly cleaned up
            const allListItems = content.querySelectorAll('li');
            allListItems.forEach(li => {
                const text = li.textContent;
                // Look for any dash-like character at the start (including em dash, en dash, hyphen)
                if (text.trim().match(/^[-–—•*]/)) {
                    li.textContent = text.trim().replace(/^[-–—•*]\s*/, '');
                }
                
                // Convert number words to digits
                if (typeof window.convertNumberWordsToDigits === 'function') {
                    li.textContent = window.convertNumberWordsToDigits(li.textContent);
                }
                
                // Also clean up any nested list items that might have been converted from text
                const nestedItems = li.querySelectorAll('li');
                nestedItems.forEach(nestedLi => {
                    const nestedText = nestedLi.textContent;
                    if (nestedText.trim().match(/^[-–—•*]/)) {
                        nestedLi.textContent = nestedText.trim().replace(/^[-–—•*]\s*/, '');
                    }
                    
                    // Convert number words to digits in nested items too
                    if (typeof window.convertNumberWordsToDigits === 'function') {
                        nestedLi.textContent = window.convertNumberWordsToDigits(nestedLi.textContent);
                    }
                });
            });
            
            // Final cleanup of whitespace between list items
            if (typeof window.removeEmptyLinesBetweenListItems === 'function') {
                window.removeEmptyLinesBetweenListItems(content);
            }
        }, 0);
    } catch (error) {
        console.error('Error generating summary:', error);
        summaryDiv.innerHTML = `
            <h3>Research Summary</h3>
            <p>Error generating summary: ${error.message}</p>
        `;
    }
}

// Clear all form fields except the NL input
function resetFormFields() {
    const fields = [
        'acupoint', 'meridian', 'special_point_category',
        'surface_region', 'related_region', 'body_region',
        'studied_condition', 'condition_context', 'country'
    ];
    
    fields.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.value = '';
        }
    });
}

// Helper function to fetch and display results
function fetchAndDisplayResults(resultsDiv) {
    if (!resultsDiv) {
        resultsDiv = document.getElementById('results');
    }
    
    if (!resultsDiv) {
        console.error('Results container not found');
        return;
    }
    
    // Show loading message
    resultsDiv.innerHTML = '<p>Searching...</p>';
    
    // Get values from form fields
    const acupoint = document.getElementById('acupoint').value;
    const meridian = document.getElementById('meridian').value;
    const specialPointCategory = document.getElementById('special_point_category').value;
    const surfaceRegion = document.getElementById('surface_region').value;
    const relatedRegion = document.getElementById('related_region').value;
    const bodyRegion = document.getElementById('body_region').value;
    const studiedCondition = document.getElementById('studied_condition').value;
    const conditionContext = document.getElementById('condition_context').value;
    const country = document.getElementById('country').value;
    
    // Check if any search field is filled
    if (!acupoint && !meridian && !specialPointCategory && !surfaceRegion && 
        !relatedRegion && !bodyRegion && !studiedCondition && !conditionContext && !country) {
        resultsDiv.innerHTML = '<p>Please enter at least one search term.</p>';
        return;
    }
    
    // Use the original search function if available
    if (typeof window.originalSearch === 'function') {
        window.originalSearch();
    } else {
        // If not available, do a basic search
        filterAndDisplayData();
    }
}

// Override resetFields function to also clear NL input
document.addEventListener('DOMContentLoaded', function() {
    // Store the original reset function
    window.originalResetFields = window.resetFields;
    
    // Create new reset function
    window.resetFields = function() {
        // Call the original function if it exists
        if (typeof window.originalResetFields === 'function') {
            window.originalResetFields();
        } else {
            // If the original doesn't exist, do the basic reset
            const inputs = document.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                input.value = '';
            });
            document.getElementById('results').innerHTML = '';
        }
        
        // Also clear the natural language search input
        const nlInput = document.getElementById('nl-search-input');
        if (nlInput) {
            nlInput.value = '';
        }
        
        // Remove any autocomplete suggestions
        closeAllLists();
    };
});

// Example questions for each filter category - Updated for Firebase deployment
const exampleQuestions = {
    acupoint: [
        "What research exists about the LI4 acupoint?",
        "Show me studies that use the Hegu point",
        "Find articles mentioning the BL23 acupoint",
        "Research on ST36 acupoint for digestive issues"
    ],
    meridian: [
        "What studies involve the Lung meridian?",
        "Research on acupoints on the Large Intestine channel",
        "Articles about the bladder meridian and pain",
        "Studies using points on the bladder meridian"
    ],
    special_point_category: [
        "Research on Yuan Source points for chronic conditions",
        "Studies using Five Shu points",
        "Articles about Back Shu points for organ disorders",
        "Use of Luo Connecting points in pain management"
    ],
    surface_region: [
        "Acupoints located on the forearm for low back pain",
        "Research on face acupuncture points",
        "Studies about points on the leg",
        "Acupuncture on the back for muscle disorders"
    ],
    related_region: [
        "Acupoints related to the metacarpal of hand digit 5",
        "Points connected to the stomach meridian for detoxification",
        "Research on points affecting the lower back",
        "Studies of acupoints associated with face"
    ],
    body_region: [
        "Acupuncture points in the upper limb region",
        "Research on trunk acupoints for back pain",
        "Studies using points on the head for headaches",
        "Points in the lower limb region for knee pain"
    ],
    studied_condition: [
        "Acupuncture treatments for lower back pain",
        "Research on acupoints effective for migraine",
        "Studies about acupuncture for fibromyalgia",
        "Articles on treating back pain with acupuncture"
    ],
    condition_context: [
        "Acupuncture in pain management contexts",
        "Research on acupoints for immune system disorders",
        "Studies in pain condition contexts",
        "Acupuncture for low back pain"
    ],
    country: [
        "Acupuncture research conducted in China",
        "Studies from the United States on acupoint usage",
        "Research from United Kingdom on osteoarthritis",
        "Swedish acupuncture treatment approaches for migraine disorders"
    ],
    combined: [
        "What acupoints on the Bladder meridian are used for lower back pain?",
        "Show me research from China about rheumatoid arthritis",
        "Find studies about treating pain with points on the bladder meridian",
        "Research on acupoints in the trunk region for fibromyalgia from United States"
    ]
};

// Export example questions for use in other modules
window.exampleQuestions = exampleQuestions;

// Function to check for zero results - simplified to show message only
function checkForZeroResults(resultsDiv, originalFilters, query, keyTerms) {
    // Check if results container shows zero results
    const resultsText = resultsDiv.textContent || '';
    if (resultsText.includes('Found 0 Articles') || resultsText.includes('No matching articles found')) {
        console.log("No results found with current filters. All filters applied as specified.");
        // No fallback searches - respect user's exact query filters
    }
}