/**
 * Embedding Provider Utilities
 * Functional utilities for working with different embedding providers
 */

const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

/**
 * Available embedding providers configuration
 */
const EMBEDDING_CONFIGS = {
    gemini: {
        model: 'text-embedding-004',
        dimension: 768,
        createInstance: (config = {}) => new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GEMINI_API_KEY,
            model: config.model || 'text-embedding-004',
            ...config
        })
    },
    // Add more providers as needed
    openai: {
        model: 'text-embedding-3-small',
        dimension: 1536,
        createInstance: (config = {}) => {
            throw new Error('OpenAI embeddings not implemented yet');
        }
    }
};

/**
 * Create embedding instance with specified provider and config
 * @param {string} provider - Provider name (default: 'gemini')
 * @param {Object} config - Optional configuration overrides
 * @returns {Object} Embedding instance
 */
function createEmbeddings(provider = 'gemini', config = {}) {
    const providerConfig = EMBEDDING_CONFIGS[provider];
    if (!providerConfig) {
        throw new Error(`Embedding provider '${provider}' not found. Available: ${Object.keys(EMBEDDING_CONFIGS).join(', ')}`);
    }
   
    return providerConfig.createInstance(config);
}

/**
 * Get available embedding providers
 * @returns {Array} List of available provider names
 */
function getAvailableEmbeddingProviders() {
    return Object.keys(EMBEDDING_CONFIGS);
}

/**
 * Get provider configuration
 * @param {string} provider - Provider name
 * @returns {Object} Provider configuration
 */
function getEmbeddingProviderConfig(provider) {
    return EMBEDDING_CONFIGS[provider] || null;
}

/**
 * Generate embeddings for a single text
 * @param {Object} embeddings - Embedding instance
 * @param {string} text - Text to embed
 * @returns {Promise<Array>} Embedding vector
 */
async function embedText(embeddings, text) {
    try {
        return await embeddings.embedQuery(text);
    } catch (error) {
        console.error('Error embedding text:', error);
        throw error;
    }
}

/**
 * Generate embeddings for multiple texts
 * @param {Object} embeddings - Embedding instance
 * @param {Array<string>} texts - Texts to embed
 * @returns {Promise<Array<Array>>} Array of embedding vectors
 */
async function embedTexts(embeddings, texts) {
    try {
        return await embeddings.embedDocuments(texts);
    } catch (error) {
        console.error('Error embedding texts:', error);
        throw error;
    }
}

/**
 * Get embedding dimension for provider
 * @param {string} provider - Provider name
 * @returns {number} Embedding dimension
 */
function getEmbeddingDimension(provider = 'gemini') {
    const config = EMBEDDING_CONFIGS[provider];
    return config ? config.dimension : null;
}

module.exports = {
    createEmbeddings,
    embedText,
    embedTexts,
    getAvailableEmbeddingProviders,
    getEmbeddingProviderConfig,
    getEmbeddingDimension,
    EMBEDDING_CONFIGS
};
