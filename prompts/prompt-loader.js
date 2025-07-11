// Prompt Loader Utility for TARA Acupoint Research NLI
// Manages loading and combining prompts from external files

class PromptLoader {
    /**
     * Load a prompt file from the prompts directory
     * @param {string} path - Relative path from prompts/ directory
     * @returns {Promise<string>} - The prompt content
     */
    static async loadPrompt(path) {
        try {
            const response = await fetch(`./prompts/${path}`);
            if (!response.ok) {
                throw new Error(`Failed to load prompt: ${path} (${response.status})`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error loading prompt from ${path}:`, error);
            throw error;
        }
    }

    /**
     * Build extraction system prompt for a specific LLM
     * @param {string} llmType - 'gemini' or 'claude'
     * @returns {Promise<string>} - Combined extraction prompt
     */
    static async buildExtractionPrompt(llmType = 'gemini') {
        try {
            const sharedPrompt = await this.loadPrompt('shared/extraction-system-prompt.txt');
            
            // Try to load LLM-specific modifications if they exist
            try {
                const specificPrompt = await this.loadPrompt(`${llmType}/extraction-modifications.txt`);
                return sharedPrompt + '\n\n' + specificPrompt;
            } catch {
                // If no LLM-specific modifications exist, just return shared prompt
                return sharedPrompt;
            }
        } catch (error) {
            console.error('Error building extraction prompt:', error);
            throw new Error(`Failed to load extraction prompts. Please ensure prompt files exist in ./prompts/ directory.`);
        }
    }

    /**
     * Build summarization prompts for a specific LLM
     * @param {string} llmType - 'gemini' or 'claude'
     * @param {string} query - User query to insert into prompt
     * @param {Object} data - Research data to insert into prompt
     * @returns {Promise<Object>} - Object with userPrompt and systemInstruction
     */
    static async buildSummarizationPrompts(llmType = 'gemini', query = '', data = {}) {
        try {
            // Load shared user prompt template
            let userPromptTemplate = await this.loadPrompt('shared/summarization-user-prompt.txt');
            
            // Replace placeholders with actual values
            const userPrompt = userPromptTemplate
                .replace('{query}', query)
                .replace('{data}', JSON.stringify(data, null, 2));

            // Load LLM-specific system instruction
            const systemInstruction = await this.loadPrompt(`${llmType}/summarization-system-instruction.txt`);

            return {
                userPrompt,
                systemInstruction
            };
        } catch (error) {
            console.error('Error building summarization prompts:', error);
            throw new Error(`Failed to load summarization prompts. Please ensure prompt files exist in ./prompts/ directory.`);
        }
    }

    /**
     * Preload all prompts for faster access
     * @returns {Promise<Object>} - Object containing all loaded prompts
     */
    static async preloadPrompts() {
        try {
            const prompts = {
                extraction: {
                    shared: await this.loadPrompt('shared/extraction-system-prompt.txt')
                },
                summarization: {
                    shared: await this.loadPrompt('shared/summarization-user-prompt.txt'),
                    gemini: await this.loadPrompt('gemini/summarization-system-instruction.txt'),
                    claude: await this.loadPrompt('claude/summarization-system-instruction.txt')
                }
            };
            
            console.log('All prompts preloaded successfully');
            return prompts;
        } catch (error) {
            console.error('Error preloading prompts:', error);
            return null;
        }
    }
}

// Make PromptLoader available globally
window.PromptLoader = PromptLoader;
