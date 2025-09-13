/**
 * Shared RAG Components - Main Export
 * Exports all shared utilities and components for easy importing
 */

// Provider utilities
const llmProvider = require('./providers/llm-provider');
const embeddingProvider = require('./providers/embedding-provider');

// Vector store utilities
const qdrantUtils = require('./vector-store/qdrant-utils');

// Utility functions
const validation = require('./utils/validation');
const textProcessing = require('./utils/text-processing');
const responseFormatting = require('./utils/response-formatting');

// Configuration
const defaultConfig = require('./config/default-config');

module.exports = {
    // Provider utilities
    providers: {
        llm: llmProvider,
        embedding: embeddingProvider
    },
    
    // Vector store utilities
    vectorStore: {
        qdrant: qdrantUtils
    },
    
    // Utility functions
    utils: {
        validation,
        textProcessing,
        responseFormatting
    },
    
    // Configuration
    config: defaultConfig,
    
    // Quick access to commonly used functions
    createLLM: llmProvider.createLLM,
    createEmbeddings: embeddingProvider.createEmbeddings,
    validateSchema: validation.validateSchema,
    createWeightedText: textProcessing.createWeightedText,
    createSuccessResponse: responseFormatting.createSuccessResponse,
    createRAGResponse: responseFormatting.createRAGResponse,
    createRAGAgentConfig: defaultConfig.createRAGAgentConfig
};
