/**
 * Default Configuration Templates
 * Provides default configuration templates that can be extended by specific RAG agents
 */

/**
 * Default RAG configuration template
 */
const DEFAULT_RAG_CONFIG = {
    // Provider settings
    providers: {
        embedding: 'gemini',
        llm: 'gemini'
    },
    
    // Vector database settings
    vectorDb: {
        collectionName: 'documents',
        vectorSize: 768, // Gemini default
        distance: 'Cosine',
        topK: 20
    },
    
    // Response settings
    response: {
        minConfidenceScore: 0.7,
        maxResults: 5,
        includeDebugInfo: false
    },
    
    // Text processing settings
    textProcessing: {
        fieldWeights: {
            title: 0.4,
            content: 0.4,
            category: 0.1,
            source: 0.1
        },
        cleanOptions: {
            removeExtraSpaces: true,
            toLowerCase: false,
            removeSpecialChars: false
        }
    },
    
    // Validation settings
    validation: {
        requiredFields: ['source', 'title', 'content'],
        textFields: {
            title: { min: 5, max: 200 },
            content: { min: 10, max: 5000 }
        }
    }
};

/**
 * Default similarity search configuration
 */
const DEFAULT_SIMILARITY_CONFIG = {
    // Similarity calculation weights
    fieldWeights: {
        semantic: 0.7,    // Vector similarity weight
        lexical: 0.3      // Text-based similarity weight
    },
    
    // Filtering options
    filtering: {
        removeDuplicates: true,
        applyConfidenceThreshold: true,
        sortByConfidence: true
    },
    
    // Business rules
    businessRules: {
        allowedSources: [],      // Empty means all sources allowed
        allowedCategories: [],   // Empty means all categories allowed
        allowedStatuses: [],     // Empty means all statuses allowed
        excludeSameId: true      // Exclude the query document itself
    }
};

/**
 * Default health check configuration
 */
const DEFAULT_HEALTH_CONFIG = {
    components: ['embeddings', 'vectorStore', 'llm'],
    timeout: 5000, // 5 seconds
    includeStats: true
};

/**
 * Default API endpoint configuration
 */
const DEFAULT_API_CONFIG = {
    endpoints: {
        search: '/search',
        health: '/health',
        capabilities: '/capabilities'
    },
    
    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // requests per window
    },
    
    // Request/Response settings
    request: {
        maxBodySize: '10mb',
        timeout: 30000 // 30 seconds
    }
};

/**
 * Create configuration by merging defaults with custom config
 * @param {Object} customConfig - Custom configuration to merge
 * @param {Object} defaults - Default configuration (optional, uses DEFAULT_RAG_CONFIG)
 * @returns {Object} Merged configuration
 */
function createConfig(customConfig = {}, defaults = DEFAULT_RAG_CONFIG) {
    return mergeDeep(defaults, customConfig);
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = mergeDeep(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

/**
 * Validate configuration against required structure
 * @param {Object} config - Configuration to validate
 * @param {Array<string>} requiredKeys - Required top-level keys
 * @returns {Object} Validation result {isValid, errors}
 */
function validateConfig(config, requiredKeys = []) {
    const errors = [];
    
    for (const key of requiredKeys) {
        if (!(key in config)) {
            errors.push(`Missing required configuration key: ${key}`);
        }
    }
    
    // Check provider configuration
    if (config.providers) {
        if (!config.providers.embedding) {
            errors.push('Missing embedding provider configuration');
        }
        if (!config.providers.llm) {
            errors.push('Missing LLM provider configuration');
        }
    }
    
    // Check vector database configuration
    if (config.vectorDb) {
        if (!config.vectorDb.collectionName) {
            errors.push('Missing vector database collection name');
        }
        if (!config.vectorDb.vectorSize || config.vectorDb.vectorSize <= 0) {
            errors.push('Invalid vector database vector size');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Get environment-specific configuration overrides
 * @param {string} environment - Environment name (development, production, test)
 * @returns {Object} Environment-specific overrides
 */
function getEnvironmentConfig(environment = process.env.NODE_ENV || 'development') {
    const envConfigs = {
        development: {
            response: {
                includeDebugInfo: true
            },
            vectorDb: {
                topK: 10 // Smaller for faster development
            }
        },
        
        production: {
            response: {
                includeDebugInfo: false
            },
            vectorDb: {
                topK: 20
            }
        },
        
        test: {
            vectorDb: {
                collectionName: 'test_documents',
                topK: 5
            },
            response: {
                maxResults: 3
            }
        }
    };
    
    return envConfigs[environment] || {};
}

/**
 * Create a complete configuration for a RAG agent
 * @param {string} agentName - Name of the RAG agent
 * @param {Object} customConfig - Custom configuration
 * @param {string} environment - Environment name
 * @returns {Object} Complete configuration
 */
function createRAGAgentConfig(agentName, customConfig = {}, environment = null) {
    // Start with defaults
    let config = { ...DEFAULT_RAG_CONFIG };
    
    // Apply environment-specific overrides
    if (environment) {
        const envConfig = getEnvironmentConfig(environment);
        config = mergeDeep(config, envConfig);
    }
    
    // Apply custom configuration
    config = mergeDeep(config, customConfig);
    
    // Set agent-specific collection name if not provided
    if (!customConfig.vectorDb?.collectionName) {
        config.vectorDb.collectionName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    
    return config;
}

module.exports = {
    DEFAULT_RAG_CONFIG,
    DEFAULT_SIMILARITY_CONFIG,
    DEFAULT_HEALTH_CONFIG,
    DEFAULT_API_CONFIG,
    createConfig,
    mergeDeep,
    validateConfig,
    getEnvironmentConfig,
    createRAGAgentConfig
};
