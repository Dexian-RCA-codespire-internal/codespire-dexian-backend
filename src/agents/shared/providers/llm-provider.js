/**
 * LLM Provider Utilities
 * Functional utilities for working with different LLM providers
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

/**
 * Available LLM providers configuration
 */
const LLM_CONFIGS = {
    gemini: {
        model: 'gemini-1.5-flash',
        temperature: 0.1,
        maxOutputTokens: 2048,
        createInstance: (config = {}) => new ChatGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
            model: config.model || 'gemini-1.5-flash',
            temperature: config.temperature || 0.1,
            maxOutputTokens: config.maxOutputTokens || 2048,
            ...config
        })
    },
    // Add more providers as needed
    openai: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 2048,
        createInstance: (config = {}) => {
            throw new Error('OpenAI provider not implemented yet');
        }
    }
};

/**
 * Create LLM instance with specified provider and config
 * @param {string} provider - Provider name (default: 'gemini')
 * @param {Object} config - Optional configuration overrides
 * @returns {Object} LLM instance
 */
function createLLM(provider = 'gemini', config = {}) {
    const providerConfig = LLM_CONFIGS[provider];
    if (!providerConfig) {
        throw new Error(`LLM provider '${provider}' not found. Available: ${Object.keys(LLM_CONFIGS).join(', ')}`);
    }
    
    return providerConfig.createInstance(config);
}

/**
 * Get available LLM providers
 * @returns {Array} List of available provider names
 */
function getAvailableLLMProviders() {
    return Object.keys(LLM_CONFIGS);
}

/**
 * Get provider configuration
 * @param {string} provider - Provider name
 * @returns {Object} Provider configuration
 */
function getLLMProviderConfig(provider) {
    return LLM_CONFIGS[provider] || null;
}

/**
 * Generate text using LLM
 * @param {Object} llm - LLM instance
 * @param {string} prompt - Text prompt
 * @returns {Promise<string>} Generated text
 */
async function generateText(llm, prompt) {
    try {
        const response = await llm.invoke(prompt);
        return response.content;
    } catch (error) {
        console.error('Error generating text:', error);
        throw error;
    }
}

/**
 * Generate structured response using LLM
 * @param {Object} llm - LLM instance
 * @param {string} prompt - Text prompt
 * @param {Object} schema - Expected response schema (for future use)
 * @returns {Promise<string>} Generated text
 */
async function generateStructuredResponse(llm, prompt, schema = null) {
    try {
        const response = await llm.invoke(prompt);
        return response.content;
    } catch (error) {
        console.error('Error generating structured response:', error);
        throw error;
    }
}

module.exports = {
    createLLM,
    generateText,
    generateStructuredResponse,
    getAvailableLLMProviders,
    getLLMProviderConfig,
    LLM_CONFIGS
};
