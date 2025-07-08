// This is the javascript code for the TARA Acupoint Research Search page. It handles autocomplete functionality
// for most of the input fields used in the index.html file. For synonimous search, the autocomplete-enabled input 
// fields are now all loaded with the synonyms for acupoints (including chinese names), meridians, anatomical locations,
// and disease conditions, annotated with the articles metadata. - Fahim Imam (March 18, 2025)


// Global variables to store the data
let sparqlData = null;
let acupointSynonyms = null;
let meridianSynonyms = null;
let anatomicalSynonyms = null;
let bodyRegionSynonyms = null;
let conditionSynonyms = null;

// Mapping objects to quickly look up synonyms by IRI
let acupointSynonymsMap = {};
let meridianSynonymsMap = {};
let anatomicalSynonymsMap = {};
let bodyRegionSynonymMap = {};
let conditionSynonymsMap = {};

// Dictionary mapping keys to json data file paths
const jsonDataLocations = { sparqlData          : 'json/article-data.json',
                            acupointSynonyms    : 'json/acupoints-synonyms.json',
                            meridianSynonyms    : 'json/meridians-synonyms.json',
                            anatomicalSynonyms  : 'json/anatomical-synonyms.json',
                            bodyRegionSynonyms  : 'json/body-regions-synonyms.json',
                            conditionSynonyms   : 'json/conditions-synonyms.json'
                          };

// function loadJSONFromFile(filename) 
// {
//     const xhr = new XMLHttpRequest();
//     xhr.overrideMimeType("application/json");
//     xhr.open('GET', filename, false);
//     xhr.send();

//     if (xhr.status === 200) 
//     {
//         jsonData =  JSON.parse(xhr.responseText)
//         return jsonData.results.bindings;
//     } 
//     else 
//     {
//         console.error("Error fetching JSON data:", xhr.statusText);
//         return null;
//     }
// }


// Fetch data when the page loads
document.addEventListener('DOMContentLoaded', async function()
{
    try 
    {
        // Load all data in parallel
        const [dataResponse, acupointSynonymsResponse, meridianSynonymsResponse, 
               anatomicalSynonymsResponse, bodyRegionSynonymsResponse,conditionSynonymsResponse] = await Promise.all
               ([
                    fetch(jsonDataLocations.sparqlData),
                    fetch(jsonDataLocations.acupointSynonyms),
                    fetch(jsonDataLocations.meridianSynonyms),
                    fetch(jsonDataLocations.anatomicalSynonyms),
                    fetch(jsonDataLocations.bodyRegionSynonyms),
                    fetch(jsonDataLocations.conditionSynonyms)
                ]);

        // Parse all JSON responses
        sparqlData = await dataResponse.json();
        acupointSynonyms = await acupointSynonymsResponse.json();
        meridianSynonyms = await meridianSynonymsResponse.json();
        anatomicalSynonyms = await anatomicalSynonymsResponse.json();
        bodyRegionSynonyms = await bodyRegionSynonymsResponse.json();
        conditionSynonyms = await conditionSynonymsResponse.json();

        // Parse all JSON files
        // sparqlData = loadJSONFromFile (jsonDataLocations.sparqlData);
        // acupointSynonyms = loadJSONFromFile (jsonDataLocations.acupointSynonyms);
        // meridianSynonyms = loadJSONFromFile (jsonDataLocations.meridianSynonyms);
        // anatomicalSynonyms = loadJSONFromFile (jsonDataLocations.anatomicalSynonyms);
        // bodyRegionSynonyms =  loadJSONFromFile (jsonDataLocations.bodyRegionSynonyms);
        // conditionSynonyms = loadJSONFromFile (jsonDataLocations.conditionSynonyms);

        console.log('All data loaded successfully');
        
        // Create lookup maps for quick access to synonyms by IRI
        createSynonymMaps();
            
        // Setup autocomplete event listeners after data is loaded
        setupAutocomplete();
    }
    catch (error)
    {
        console.error('Error loading data:', error);
        document.getElementById('results').innerHTML = '<p>Error loading data. Please check the console for details.</p>';
    }
});

// Create maps for quick synonym lookup by IRI
function createSynonymMaps()
{
    // Map acupoint synonyms
    if (acupointSynonyms && acupointSynonyms.results && acupointSynonyms.results.bindings)
    {
        acupointSynonyms.results.bindings.forEach(item =>
            {
                const iri = item.Acupoint_IRI.value;
                const synonym = item.Acupoint_Synonym.value;
                
                if (!acupointSynonymsMap[iri])
                    {
                        acupointSynonymsMap[iri] = new Set();
                    }
            acupointSynonymsMap[iri].add(synonym);
            });
    }
    
    // Map meridian synonyms
    if (meridianSynonyms && meridianSynonyms.results && meridianSynonyms.results.bindings)
    {
        meridianSynonyms.results.bindings.forEach(item => 
            {
                const iri = item.Meridian_IRI.value;
                const synonym = item.Meridian_Synonym.value;
            
                if (!meridianSynonymsMap[iri])
                {
                    meridianSynonymsMap[iri] = new Set();
                }
            meridianSynonymsMap[iri].add(synonym);
        });
    }
    
    // Map anatomical synonyms (used for both Surface Region and Related Region)
    if (anatomicalSynonyms && anatomicalSynonyms.results && anatomicalSynonyms.results.bindings)
    {
        anatomicalSynonyms.results.bindings.forEach(item =>
        {
            const iri = item.Anatomical_Region_IRI.value;
            const synonym = item.Anatomical_Region_Synonym.value;
            
            if (!anatomicalSynonymsMap[iri])
            {
                anatomicalSynonymsMap[iri] = new Set();
            }
            anatomicalSynonymsMap[iri].add(synonym);
        });
    }

     // Map anatomical synonyms (used for both Surface Region and Related Region)
     if (bodyRegionSynonyms && bodyRegionSynonyms.results && bodyRegionSynonyms.results.bindings)
        {
            bodyRegionSynonyms.results.bindings.forEach(item =>
            {
                const iri = item.Body_Region_IRI.value;
                const synonym = item.Body_Region_Synonym.value;
                
                if (!bodyRegionSynonymMap[iri])
                {
                    bodyRegionSynonymMap[iri] = new Set();
                }
                bodyRegionSynonymMap[iri].add(synonym);
            });
        }
    
    // Map condition synonyms
    if (conditionSynonyms && conditionSynonyms.results && conditionSynonyms.results.bindings)
    {
        conditionSynonyms.results.bindings.forEach(item =>
        {
            const iri = item.Studied_Condition_IRI.value;
            const synonym = item.Studied_Condition_Synonym.value;
            
            if (!conditionSynonymsMap[iri])
            {
                conditionSynonymsMap[iri] = new Set();
            }
            conditionSynonymsMap[iri].add(synonym);
        });
    }
}

// Setup autocomplete for all input fields
function setupAutocomplete()
{
    const fields = [ { id: 'acupoint', field: 'Acupoint' },
                     { id: 'meridian', field: 'Meridian' },
                     { id: 'special_point_category', field: 'Special_Point_Category' },
                     { id: 'surface_region', field: 'Surface_Region' },
                     { id: 'related_region', field: 'Related_Region' },
                     { id: 'body_region', field: 'Body_Region' },
                     { id: 'studied_condition', field: 'Studied_Condition' },
                     { id: 'condition_context', field: 'Condition_Context' },
                     { id: 'country', field: 'Country' }
                    ];
    
    fields.forEach(item =>
    {
        const input = document.getElementById(item.id);
        if (input)
        {
            // Replace the inline handler with an event listener
            input.removeAttribute('oninput');
            input.addEventListener('input', function()
            {
                handleAutocomplete(this, item.field);
            });
        }
    });
}

// Function to get unique values for a specific field from the data, including synonyms
function getUniqueValues(fieldName)
{
    if (!sparqlData || !sparqlData.results || !sparqlData.results.bindings)
    {
        return [];
    }
    
    const uniqueValues = new Set();
    
    sparqlData.results.bindings.forEach(binding =>
    {
        // Add the main value if it exists
        if (binding[fieldName] && binding[fieldName].value)
        {
            uniqueValues.add(binding[fieldName].value);
            
            // Add synonyms based on the field type
            switch (fieldName) 
            {
                case 'Acupoint':
                    if (binding.Acupoint_IRI && binding.Acupoint_IRI.value)
                    {
                        const iri = binding.Acupoint_IRI.value;
                        if (acupointSynonymsMap[iri])
                        {
                            acupointSynonymsMap[iri].forEach(synonym => uniqueValues.add(synonym));
                        }
                    }
                    break;
                    
                case 'Meridian':
                    if (binding.Meridian_IRI && binding.Meridian_IRI.value)
                    {
                        const iri = binding.Meridian_IRI.value;
                        if (meridianSynonymsMap[iri])
                        {
                            meridianSynonymsMap[iri].forEach(synonym => uniqueValues.add(synonym));
                        }
                    }
                    break;
                    
                case 'Surface_Region':
                    if (binding.Surface_Region_IRI && binding.Surface_Region_IRI.value)
                    {
                        const iri = binding.Surface_Region_IRI.value;
                        if (anatomicalSynonymsMap[iri])
                        {
                            anatomicalSynonymsMap[iri].forEach(synonym => uniqueValues.add(synonym));
                        }
                    }
                    break;
                    
                case 'Related_Region':
                    if (binding.Related_Region_IRI && binding.Related_Region_IRI.value)
                    {
                        const iri = binding.Related_Region_IRI.value;
                        if (anatomicalSynonymsMap[iri])
                        {
                            anatomicalSynonymsMap[iri].forEach(synonym => uniqueValues.add(synonym));
                        }
                    }
                    break;
                
                case 'Body_Region':
                    if (binding.Body_Region_IRI && binding.Body_Region_IRI.value)
                    {
                        const iri = binding.Body_Region_IRI.value;
                        if (bodyRegionSynonymMap[iri])
                        {
                            bodyRegionSynonymMap[iri].forEach(synonym => uniqueValues.add(synonym));
                        }
                    }
                    break;
                    
                case 'Studied_Condition':
                    if (binding.Studied_Condition_IRI && binding.Studied_Condition_IRI.value)
                    {
                        const iri = binding.Studied_Condition_IRI.value;
                        if (conditionSynonymsMap[iri])
                        {
                            conditionSynonymsMap[iri].forEach(synonym => uniqueValues.add(synonym));
                        }
                    }
                    break;
            }
        }
    });
    
    return Array.from(uniqueValues).sort();
}

// Autocomplete handler function
function handleAutocomplete(input, fieldName)
{
    const val = input.value.toLowerCase();
    const uniqueValues = getUniqueValues(fieldName);
    
    // Clear previous suggestions
    const existingList = document.getElementById('autocomplete-list');
    if (existingList)
    {
        existingList.remove();
    }
    
    if (!val) return;
    
    // Create suggestions container
    const suggestionsList = document.createElement('div');
    suggestionsList.setAttribute('id', 'autocomplete-list');
    suggestionsList.setAttribute('class', 'autocomplete-items');
    input.parentNode.appendChild(suggestionsList); 

    // Filter matching values
    const matchingValues = uniqueValues.filter(value =>
        value.toLowerCase().includes(val)
    );
    
    let currentFocus = -1;

    // Create suggestion elements
    matchingValues.forEach((value, index) =>
    {
        const item = document.createElement('div');
        // Highlight matching part
        const matchIndex = value.toLowerCase().indexOf(val);
        item.innerHTML = value.substring(0, matchIndex) + 
                        '<strong>' + value.substring(matchIndex, matchIndex + val.length) + '</strong>' +
                        value.substring(matchIndex + val.length);
        
        item.addEventListener('click', function()
        {
            input.value = value;
            closeAllLists();
        });

        item.addEventListener('mouseover', function()
        {
            currentFocus = index;
            updateActiveItems(suggestionsList, currentFocus);
        });

        suggestionsList.appendChild(item);
    });

    // Add keyboard navigation: Up and Down arrows
    input.addEventListener('keydown', function(e)
    {
        const items = suggestionsList.getElementsByTagName('div');
        if (items.length === 0) return; // Ensure items exist before accessing them

        if (e.key === 'ArrowDown')
        {
            currentFocus = (currentFocus + 1) % items.length; // Prevent out-of-bounds
            updateActiveItems(suggestionsList, currentFocus);
        }
        else if (e.key === 'ArrowUp')
        {
            currentFocus = (currentFocus - 1 + items.length) % items.length; // Prevent out-of-bounds
            updateActiveItems(suggestionsList, currentFocus);
        } 
        else if (e.key === 'Enter')
        {
            e.preventDefault(); // Prevent form submission
            
            if (currentFocus > -1 && items[currentFocus]) 
            {
                input.value = items[currentFocus].innerText;
                closeAllLists();
            }
        }
    });

    // Helper function to update active class for navigation
    function updateActiveItems(list, focusIndex)
    {
        const items = list.getElementsByTagName('div');
        if (!items.length) return; // Ensure items exist

        // Remove active class from all items
        Array.from(items).forEach(item => item.classList.remove('autocomplete-active'));

        if (focusIndex >= 0 && focusIndex < items.length)
        {
            items[focusIndex].classList.add('autocomplete-active');
        }
    }
}

// Close all autocomplete lists except the one passed as argument
function closeAllLists(elmnt)
{
    const items = document.getElementsByClassName('autocomplete-items');
    for (let i = 0; i < items.length; i++)
    {
        if (elmnt !== items[i])
        {
            if (items[i].parentNode) items[i].parentNode.removeChild(items[i]);
        }
    }
}


// Close autocomplete lists when clicking elsewhere
document.addEventListener('click', function(e)
{
    closeAllLists(e.target);
});

// Reset all input fields
function resetFields()
{
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(input =>
    {
        input.value = '';
    });
    document.getElementById('results').innerHTML = '';
}

// Helper function to find ALL IRIs by value or synonym
function findAllIRIsByValueOrSynonym(fieldName, value)
{
    if (!value) return [];
    
    const normalizedValue = value.toLowerCase();
    const matchingIRIs = new Set();
    
    // Different handling based on field type
    switch (fieldName)
    {
        case 'Acupoint':
            // Check if the value directly matches any acupoint
            for (const binding of sparqlData.results.bindings)
            {
                if (binding.Acupoint && binding.Acupoint.value && 
                    binding.Acupoint.value.toLowerCase() === normalizedValue &&
                    binding.Acupoint_IRI && binding.Acupoint_IRI.value)
                    {
                        matchingIRIs.add(binding.Acupoint_IRI.value);
                    }
            }
            
            // Check synonyms
            for (const iri in acupointSynonymsMap)
                {
                    for (const synonym of acupointSynonymsMap[iri]) 
                        {
                            if (synonym.toLowerCase() === normalizedValue)
                                {
                                    matchingIRIs.add(iri);
                                }
                        }
                }
            break;
            
        case 'Meridian':
            // Direct match
            for (const binding of sparqlData.results.bindings)
            {
                if (binding.Meridian && binding.Meridian.value && 
                    binding.Meridian.value.toLowerCase() === normalizedValue &&
                    binding.Meridian_IRI && binding.Meridian_IRI.value)
                    {
                        matchingIRIs.add(binding.Meridian_IRI.value);
                    }
            }
            
            // Synonym match
            for (const iri in meridianSynonymsMap)
            {
                for (const synonym of meridianSynonymsMap[iri])
                {
                    if (synonym.toLowerCase() === normalizedValue)
                        {
                            matchingIRIs.add(iri);
                        }
                }
            }
            break;
            
        case 'Surface_Region':
            // Direct match
            for (const binding of sparqlData.results.bindings)
            {
                if (binding.Surface_Region && binding.Surface_Region.value && 
                    binding.Surface_Region.value.toLowerCase() === normalizedValue &&
                    binding.Surface_Region_IRI && binding.Surface_Region_IRI.value)
                {
                    matchingIRIs.add(binding.Surface_Region_IRI.value);
                }
            }
            
            // Synonym match
            for (const iri in anatomicalSynonymsMap)
            {
                for (const synonym of anatomicalSynonymsMap[iri])
                {
                    if (synonym.toLowerCase() === normalizedValue)
                        {
                            matchingIRIs.add(iri);
                        }
                }
            }
            break;
            
        case 'Related_Region':
            // Direct match
            for (const binding of sparqlData.results.bindings)
            {
                if (binding.Related_Region && binding.Related_Region.value && 
                    binding.Related_Region.value.toLowerCase() === normalizedValue &&
                    binding.Related_Region_IRI && binding.Related_Region_IRI.value)
                {
                    matchingIRIs.add(binding.Related_Region_IRI.value);
                }
            }
            
            // Synonym match
            for (const iri in anatomicalSynonymsMap)
            {
                for (const synonym of anatomicalSynonymsMap[iri])
                {
                    if (synonym.toLowerCase() === normalizedValue)
                    {
                        matchingIRIs.add(iri);
                    }
                }
            }
            break;
        
        case 'Body_Region':
            // Direct match
            for (const binding of sparqlData.results.bindings)
            {
                if (binding.Body_Region && binding.Body_Region.value && 
                    binding.Body_Region.value.toLowerCase() === normalizedValue &&
                    binding.Body_Region_IRI && binding.Body_Region_IRI.value)
                {
                    matchingIRIs.add(binding.Body_Region_IRI.value);
                }
            }
            
            // Synonym match
            for (const iri in bodyRegionSynonymMap)
            {
                for (const synonym of bodyRegionSynonymMap[iri])
                {
                    if (synonym.toLowerCase() === normalizedValue)
                    {
                        matchingIRIs.add(iri);
                    }
                }
            }
            break;
            
        case 'Studied_Condition':
            // Direct match
            for (const binding of sparqlData.results.bindings)
            {
                if (binding.Studied_Condition && binding.Studied_Condition.value && 
                    binding.Studied_Condition.value.toLowerCase() === normalizedValue &&
                    binding.Studied_Condition_IRI && binding.Studied_Condition_IRI.value)
                {
                    matchingIRIs.add(binding.Studied_Condition_IRI.value);
                }
            }
            
            // Synonym match
            for (const iri in conditionSynonymsMap)
            {
                for (const synonym of conditionSynonymsMap[iri])
                    {
                        if (synonym.toLowerCase() === normalizedValue)
                            {
                                matchingIRIs.add(iri);
                            }
                    }
            }
            break;
    }
    
    return Array.from(matchingIRIs);
}

// Search function
function search()
{
    if (!sparqlData || !sparqlData.results || !sparqlData.results.bindings)
    {
        document.getElementById('results').innerHTML = '<p>No data available. Please try again later.</p>';
        return;
    }
    
    const filters = 
    {
        Acupoint: document.getElementById('acupoint').value,
        Meridian: document.getElementById('meridian').value,
        Special_Point_Category: document.getElementById('special_point_category').value,
        Surface_Region: document.getElementById('surface_region').value,
        Related_Region: document.getElementById('related_region').value,
        Body_Region: document.getElementById('body_region').value,
        Studied_Condition: document.getElementById('studied_condition').value,
        Condition_Context: document.getElementById('condition_context').value,
        Country: document.getElementById('country').value
    };
    
    // Get all matching IRIs for fields with synonyms
    const filterIRIs = {
                            Acupoint: filters.Acupoint ? findAllIRIsByValueOrSynonym('Acupoint', filters.Acupoint) : [],
                            Meridian: filters.Meridian ? findAllIRIsByValueOrSynonym('Meridian', filters.Meridian) : [],
                            Surface_Region: filters.Surface_Region ? findAllIRIsByValueOrSynonym('Surface_Region', filters.Surface_Region) : [],
                            Related_Region: filters.Related_Region ? findAllIRIsByValueOrSynonym('Related_Region', filters.Related_Region) : [],
                            Body_Region: filters.Body_Region ? findAllIRIsByValueOrSynonym('Body_Region', filters.Body_Region) : [],
                            Studied_Condition: filters.Studied_Condition ? findAllIRIsByValueOrSynonym('Studied_Condition', filters.Studied_Condition) : []
                        };
    
    // Get active search criteria
    const activeFilters = Object.entries(filters)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`);
    
    // Filter results
    const filteredResults = sparqlData.results.bindings.filter(binding =>
    {
        return Object.keys(filters).every(key =>
        {
            if (!filters[key]) return true; // Skip empty filters
            
            // For fields with synonyms, match by any of the IRIs if found
            if (['Acupoint', 'Meridian', 'Surface_Region', 'Related_Region', 'Body_Region', 'Studied_Condition'].includes(key) && filterIRIs[key].length > 0)
            {
                const iriField = key + '_IRI';
                if (binding[iriField] && binding[iriField].value)
                {
                    return filterIRIs[key].includes(binding[iriField].value);
                }
                return false;
            } 
            // For other fields, do text matching
            else {
                if (!binding[key] || !binding[key].value) return false;
                return binding[key].value.toLowerCase().includes(filters[key].toLowerCase());
            }
        });
    });
    
    // Group results by article
    const groupedResults = {};
    filteredResults.forEach(result =>
        {
        const articleTitle = result.Studied_Article_Title ? result.Studied_Article_Title.value : 'Unknown Title';
        if (!groupedResults[articleTitle])
            {
             groupedResults[articleTitle] = 
                {
                    articleInfo: result,
                    acupointData: []
                };
        }
        
        // Add condition data
        if (result.Studied_Condition && result.Studied_Condition.value)
        {
            if (!groupedResults[articleTitle].conditions)
            {
                groupedResults[articleTitle].conditions = new Set();
            }
            groupedResults[articleTitle].conditions.add(result.Studied_Condition.value);
        }
        
        // Add condition context data
        if (result.Condition_Context && result.Condition_Context.value)
        {
            if (!groupedResults[articleTitle].conditionContexts)
            {
                groupedResults[articleTitle].conditionContexts = new Set();
            }
            groupedResults[articleTitle].conditionContexts.add(result.Condition_Context.value);
        }
        
        groupedResults[articleTitle].acupointData.push(result);
    });
    
    // Display results
    displayResults(groupedResults, activeFilters);
}

// Function to display search results
function displayResults(groupedResults, activeFilters)
{
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    
    const articleCount = Object.keys(groupedResults).length;
    
    // Create search summary
    const searchSummary = document.createElement('div');
    searchSummary.className = 'search-summary';
    
    searchSummary.innerHTML = `<p>Found <strong>${articleCount}</strong> Article${articleCount !== 1 ? 's' : ''} 
                                ${activeFilters.length > 0 ? '| Matching Criteria: ' + activeFilters.join(', ') : ''}</p>`;
    
    
    resultsDiv.appendChild(searchSummary);
    
    if (articleCount === 0)
    {
        resultsDiv.innerHTML += '<p>No results found. Please verify your inputs or reset the filters and search again.</p>';

        return;
    }
    
    for (const title in groupedResults)
        {
            const articleGroup = document.createElement('div');
            articleGroup.className = 'article-group';
            
            const articleData = groupedResults[title].articleInfo;
            const acupointData = groupedResults[title].acupointData;
            
            // Create article metadata table
            const metadataTable = document.createElement('table');
            metadataTable.className = 'result-table';
            
            // Title row with link
            const titleRow = document.createElement('tr');
            const titleCell = document.createElement('td');
            titleCell.colSpan = 3;
            
            const articleTitle = articleData.Studied_Article_Title ? articleData.Studied_Article_Title.value : 'Unknown Title';
            const doi = articleData.Studied_Article_IRI ? articleData.Studied_Article_IRI.value : '';
            
            if (doi)
            {
                titleCell.innerHTML = `<a href="${doi}" target="_blank"><strong>${articleTitle}</strong></a>`;
            } 
            else
            {
                titleCell.innerHTML = `<strong>${articleTitle}</strong>`;
            }
            
            titleRow.appendChild(titleCell);
            metadataTable.appendChild(titleRow);
            
            // MLA style reference row
            const referenceRow = document.createElement('tr');
            const referenceCell = document.createElement('td');
            referenceCell.colSpan = 3;
            
            // Format MLA reference
            const authors = articleData.Authors ? articleData.Authors.value : 'Unknown';
            const pubYear = articleData.Publication_Date ? articleData.Publication_Date.value : '';
            const publicationVenue = articleData.Publication_Venue ? articleData.Publication_Venue.value : '';
            
            let mlaReference = `${authors}. "${articleTitle}." <i>${publicationVenue}</i>`;
            
            if (pubYear)
            {
                mlaReference += `, ${pubYear}`;
            }
            
            if (doi)
            {
                mlaReference += `. <a href="${doi}" target="_blank">${doi}</a>`;
            }
            
            referenceCell.innerHTML = mlaReference;
            referenceRow.appendChild(referenceCell);
            metadataTable.appendChild(referenceRow);
            
            // Create third row with three columns
            const thirdRow = document.createElement('tr');
            
            // First column: Condition information
            const conditionCell = document.createElement('td');
            
            // Get unique conditions
            // const conditions = groupedResults[title].conditions ? Array.from(groupedResults[title].conditions).join(', ') : '';
            const conditions = groupedResults[title].conditions ? Array.from(groupedResults[title].conditions).map(condition => 
                `<a href="${articleData.Studied_Condition_IRI.value}" target="_blank">${condition}</a>`).join(', '): '';

            const conditionNote = articleData.Condition_Note ? articleData.Condition_Note.value : '';
        
            // const conditionContexts = groupedResults[title].conditionContexts ? Array.from(groupedResults[title].conditionContexts).join(', ') : '';
            const conditionContexts = groupedResults[title].conditionContexts ? Array.from(groupedResults[title].conditionContexts).map(context =>
                `<a href="${articleData.Condition_Context_IRI.value}" target="_blank">${context}</a>`).join(', '): '';
            
            const country = articleData.Country ? articleData.Country.value : '';
            
            conditionCell.innerHTML = `<strong>Studied Condition</strong><br> ${conditions}`;
            if (conditionNote) conditionCell.innerHTML += `<br><span class="small-space"></span><strong>Condition Note</strong><br> ${conditionNote}`;
            if (conditionContexts) conditionCell.innerHTML += `<br><span class="small-space"></span><strong>Condition Context</strong><br> ${conditionContexts}`;
            if (country) conditionCell.innerHTML += `<br><span class="small-space"></span><strong>Country</strong><br> ${country}`;
            
            thirdRow.appendChild(conditionCell);
            
            // Second column: Clinical trial type and other relevant information
            const infoCell = document.createElement('td');
            
            const trialType = articleData.Trial_Type ? articleData.Trial_Type.value : '';
            const sampleSize = articleData.Sample_Size ? articleData.Sample_Size.value : '';
            const controls = articleData.Controls ? articleData.Controls.value : '';

            const modality = articleData.Modality ? articleData.Modality.value : '';
            const stimulationType = articleData.Stimulation_Type ? articleData.Stimulation_Type.value : '';
            const needlingInfo = articleData.Needling_Info ? articleData.Needling_Info.value : '';
            
            if (trialType) infoCell.innerHTML = `<strong>Trial Type:</strong> ${trialType}`;
            if (sampleSize) infoCell.innerHTML += `<br><span class="small-space"></span><strong>Sample Size</strong><br> ${sampleSize}`;
            if (controls) infoCell.innerHTML += `<br><span class="small-space"></span><strong>Control Groups</strong><br> ${controls}`;
            
            if (modality) infoCell.innerHTML += `<br><span class="small-space"></span><strong>Acupuncture Modality</strong><br> ${modality}`;
            if (stimulationType) infoCell.innerHTML += `<br><span class="small-space"></span><strong>Stimulation Type</strong><br> ${stimulationType}`;        
            if (needlingInfo) infoCell.innerHTML += `<br><span class="small-space"></span><strong>Needling Details</strong><br> ${needlingInfo}`;
            
            thirdRow.appendChild(infoCell);
            metadataTable.appendChild(thirdRow);
            
            // Listed acupoints row
            const acupointsRow = document.createElement('tr');
            const acupointsCell = document.createElement('td');
            acupointsCell.colSpan = 3;
            
            if (articleData.Listed_Acupoints && articleData.Listed_Acupoints.value)
            {
                acupointsCell.innerHTML = `<strong>Listed Acupoints:</strong> ${articleData.Listed_Acupoints.value}`;
            }
            else
            {
                acupointsCell.innerHTML = '<strong>Listed Acupoints:</strong> None specified';
            }
            
            acupointsRow.appendChild(acupointsCell);
            metadataTable.appendChild(acupointsRow);
            
            articleGroup.appendChild(metadataTable);
            
            // Group acupoint data to avoid duplicates
            const uniqueAcupoints = {};
            acupointData.forEach(data =>
            {
                const acupoint = data.Acupoint ? data.Acupoint.value : '';
                if (!acupoint) return;
                
                if (!uniqueAcupoints[acupoint])
                {
                    uniqueAcupoints[acupoint] =
                    {
                        acupoint: acupoint,
                        acupointIRI: data.Acupoint_IRI ? data.Acupoint_IRI.value : '',
                        meridian: data.Meridian ? data.Meridian.value : '',
                        meridianIRI: data.Meridian_IRI ? data.Meridian_IRI.value : '',
                        specialPointRoles: new Set(),
                        specialPointRoleIRIs: new Set(),
                        surfaceRegion: data.Surface_Region ? data.Surface_Region.value : '',
                        surfaceRegionIRI: data.Surface_Region_IRI ? data.Surface_Region_IRI.value : '',
                        relatedRegions: new Set(),
                        relatedRegionIRIs: new Set(),
                        bodyRegions: new Set(),
                        bodyRegionIRIs: new Set()
                    };
                }
                
                // Add special point role
                if (data.Special_Point_Role && data.Special_Point_Role.value)
                {
                    uniqueAcupoints[acupoint].specialPointRoles.add(data.Special_Point_Role.value);
                    if (data.Special_Point_Role_IRI && data.Special_Point_Role_IRI.value)
                    {
                        uniqueAcupoints[acupoint].specialPointRoleIRIs.add(data.Special_Point_Role_IRI.value);
                    }
                }

                // Add related region
                if (data.Related_Region && data.Related_Region.value)
                {
                    uniqueAcupoints[acupoint].relatedRegions.add(data.Related_Region.value);
                    if (data.Related_Region_IRI && data.Related_Region_IRI.value)
                    {
                        uniqueAcupoints[acupoint].relatedRegionIRIs.add(data.Related_Region_IRI.value);
                    }
                }
                
                // Add body region
                if (data.Body_Region && data.Body_Region.value)
                {
                    uniqueAcupoints[acupoint].bodyRegions.add(data.Body_Region.value);
                    if (data.Body_Region_IRI && data.Body_Region_IRI.value)
                    {
                        uniqueAcupoints[acupoint].bodyRegionIRIs.add(data.Body_Region_IRI.value);
                    }
                }
            });
        
        // Create acupoint details table
        const detailsTable = document.createElement('table');
        detailsTable.className = 'result-table acupoint-table';
        
        // Table header
        const headerRow = document.createElement('tr');
        ['Acupoint', 'Meridian', 'Special Point Role', 'Surface Region', 'Related Region', 'Body Region'].forEach(headerText =>
        {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        detailsTable.appendChild(headerRow);
        
        // Table rows with acupoint data
        Object.values(uniqueAcupoints).forEach((data, index) => 
        {
            const row = document.createElement('tr');
            if (index % 2 === 1)
            {
                row.className = 'even-row';
            }
            
            // Acupoint cell with link
            const acupointCell = document.createElement('td');
            if (data.acupoint && data.acupointIRI)
            {
                const link = document.createElement('a');
                link.href = data.acupointIRI;
                link.target = '_blank';
                link.textContent = data.acupoint;
                acupointCell.appendChild(link);
            }
            else
            {
                acupointCell.textContent = data.acupoint;
            }
            row.appendChild(acupointCell);

        // Meridian cell with link
        const meridianCell = document.createElement('td');
        if (data.meridian && data.meridianIRI)
        {
            const link = document.createElement('a');
            link.href = data.meridianIRI;
            link.target = '_blank';
            link.textContent = data.meridian;
            meridianCell.appendChild(link);
        }
        else
        {
            meridianCell.textContent = data.meridian;
        }
        row.appendChild(meridianCell);
        
        // Special Point Role cell with links
        const specialPointCell = document.createElement('td');
        if (data.specialPointRoles.size > 0)
        {
            const specialPointRolesArr = Array.from(data.specialPointRoles);
            const specialPointRoleIRIsArr = Array.from(data.specialPointRoleIRIs);
            
            specialPointRolesArr.forEach((role, i) =>
                {
                if (i > 0)
                    {
                        specialPointCell.appendChild(document.createTextNode(', '));
                    }
                
                if (i < specialPointRoleIRIsArr.length)
                {
                    const link = document.createElement('a');
                    link.href = specialPointRoleIRIsArr[i];
                    link.target = '_blank';
                    link.textContent = role;
                    specialPointCell.appendChild(link);
                }
                else 
                    {
                        specialPointCell.appendChild(document.createTextNode(role));
                    }
            });
        }
        row.appendChild(specialPointCell);
        
        // Surface Region cell with link
        const surfaceRegionCell = document.createElement('td');
        if (data.surfaceRegion && data.surfaceRegionIRI)
        {
            const link = document.createElement('a');
            link.href = data.surfaceRegionIRI;
            link.target = '_blank';
            link.textContent = data.surfaceRegion;
            surfaceRegionCell.appendChild(link);
        }
        else
        {
            surfaceRegionCell.textContent = data.surfaceRegion;
        }
        row.appendChild(surfaceRegionCell);
        
        // Related Region cell with links
        const relatedRegionCell = document.createElement('td');
        if (data.relatedRegions.size > 0)
        {
            const relatedRegionsArr = Array.from(data.relatedRegions);
            const relatedRegionIRIsArr = Array.from(data.relatedRegionIRIs);
            
            relatedRegionsArr.forEach((region, i) =>
            {
                if (i > 0)
                {
                    relatedRegionCell.appendChild(document.createTextNode(', '));
                }
                
                if (i < relatedRegionIRIsArr.length)
                {
                    const link = document.createElement('a');
                    link.href = relatedRegionIRIsArr[i];
                    link.target = '_blank';
                    link.textContent = region;
                    relatedRegionCell.appendChild(link);
                }
                
                else
                {
                    relatedRegionCell.appendChild(document.createTextNode(region));
                }
            });
        }
        row.appendChild(relatedRegionCell);
        
        // Body Region cell with links
        const bodyRegionCell = document.createElement('td');
        if (data.bodyRegions.size > 0) {
            const bodyRegionsArr = Array.from(data.bodyRegions);
            const bodyRegionIRIsArr = Array.from(data.bodyRegionIRIs);
            
            bodyRegionsArr.forEach((region, i) =>
            {
                if (i > 0) 
                {
                    bodyRegionCell.appendChild(document.createTextNode(', '));
                }
                
                if (i < bodyRegionIRIsArr.length)
                {
                    const link = document.createElement('a');
                    link.href = bodyRegionIRIsArr[i];
                    link.target = '_blank';
                    link.textContent = region;
                    bodyRegionCell.appendChild(link);
                } 
                else
                {
                    bodyRegionCell.appendChild(document.createTextNode(region));
                }
            });
        }
        row.appendChild(bodyRegionCell);
        detailsTable.appendChild(row);
        });

        articleGroup.appendChild(detailsTable);

        // Add some space between article groups
        const spacer = document.createElement('div');
        spacer.style.height = '20px';
        articleGroup.appendChild(spacer);

        resultsDiv.appendChild(articleGroup);
    } // End of for (const title in groupedResults)

}

// Make the functions available globally
window.search = search;
window.resetFields = resetFields;
window.handleAutocomplete = handleAutocomplete;