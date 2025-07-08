// Helper module to clean up Gemini summaries
// This handles the conversion of dash-prefixed text lines to proper bullet points,
// removal of empty lines between list items, and number word to digit conversion

// Number word to digit mapping
const numberWords = {
    'zero': '0',
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9',
    'ten': '10',
    'eleven': '11',
    'twelve': '12',
    'thirteen': '13',
    'fourteen': '14',
    'fifteen': '15',
    'sixteen': '16',
    'seventeen': '17',
    'eighteen': '18',
    'nineteen': '19',
    'twenty': '20'
};

// Convert number words to digits in the given text
function convertNumberWordsToDigits(text) {
    if (!text) return text;
    
    // Create a regex that matches all the number words, ensuring they're whole words
    const numberRegex = new RegExp(`\\b(${Object.keys(numberWords).join('|')})\\b`, 'gi');
    
    return text.replace(numberRegex, match => {
        // Get the digit, ignoring case
        return numberWords[match.toLowerCase()];
    });
}

// Function to clean a DOM node of any lines starting with dashes
function cleanDashPrefixedText(rootNode) {
    if (!rootNode) return;

    // Process all text nodes recursively
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text.trim() && text.trim().match(/^[-–—•*]/)) {
                // If this is a text node starting with a dash
                const cleanedText = text.trim().replace(/^[-–—•*]\s*/, '');
                
                // Create a proper list item
                const li = document.createElement('li');
                li.textContent = cleanedText;
                const ul = document.createElement('ul');
                ul.appendChild(li);
                
                // Replace the text node with proper list
                if (node.parentNode) {
                    node.parentNode.replaceChild(ul, node);
                    return true; // We made a change
                }
            }
            return false;
        }
        
        // For element nodes, process each child recursively
        if (node.hasChildNodes()) {
            let childrenArray = Array.from(node.childNodes);
            let changesMade = false;
            
            // Process each child
            for (let i = 0; i < childrenArray.length; i++) {
                const changed = processNode(childrenArray[i]);
                if (changed) {
                    // Refresh the children array as the DOM structure has changed
                    childrenArray = Array.from(node.childNodes);
                    changesMade = true;
                }
            }
            return changesMade;
        }
        return false;
    }
    
    // Process the entire summary content repeatedly until no more changes are made
    let changesMade;
    do {
        changesMade = processNode(rootNode);
    } while (changesMade);
    
    // Final pass to clean up any dash prefixes in list items
    const allListItems = rootNode.querySelectorAll('li');
    allListItems.forEach(li => {
        const text = li.textContent;
        if (text.trim().match(/^[-–—•*]/)) {
            li.textContent = text.trim().replace(/^[-–—•*]\s*/, '');
        }
        
        // Convert number words to digits in list items
        li.textContent = convertNumberWordsToDigits(li.textContent);
    });
    
    // Remove empty space between list items
    removeEmptyLinesBetweenListItems(rootNode);
    
    // Convert number words to digits in paragraphs
    const allParagraphs = rootNode.querySelectorAll('p');
    allParagraphs.forEach(p => {
        p.textContent = convertNumberWordsToDigits(p.textContent);
    });
    
    // Convert number words in headings
    const allHeadings = rootNode.querySelectorAll('h2, h3, h4');
    allHeadings.forEach(heading => {
        heading.textContent = convertNumberWordsToDigits(heading.textContent);
    });
}

// Function to remove empty lines between list items
function removeEmptyLinesBetweenListItems(rootNode) {
    const allLists = rootNode.querySelectorAll('ul, ol');
    
    allLists.forEach(list => {
        // Look for and remove any empty text nodes between list items
        let childNodes = Array.from(list.childNodes);
        
        childNodes.forEach(node => {
            // If this is a text node that's just whitespace between list items, remove it
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') {
                list.removeChild(node);
            }
        });
        
        // Also ensure there's no space between list items by setting CSS
        list.style.lineHeight = '1.4';
        list.style.marginBottom = '10px';
        
        // Make sure list items are close together
        const listItems = list.querySelectorAll('li');
        listItems.forEach(li => {
            li.style.marginBottom = '5px'; // Reduce space between items
            li.style.paddingBottom = '0'; 
        });
        
        // If the last list item has margin, remove it
        if (listItems.length > 0) {
            listItems[listItems.length - 1].style.marginBottom = '0';
        }
    });
}

// Export the functions for use in other modules
window.cleanDashPrefixedText = cleanDashPrefixedText;
window.convertNumberWordsToDigits = convertNumberWordsToDigits;
window.removeEmptyLinesBetweenListItems = removeEmptyLinesBetweenListItems;
