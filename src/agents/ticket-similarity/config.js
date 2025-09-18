/**
 * Ticket Similarity Agent Configuration - Refactored
 * Uses shared configuration system with ticket-specific settings
 */

const { config: defaultConfig } = require('../shared');

// Create ticket similarity configuration using shared utilities
const config = defaultConfig.createRAGAgentConfig('ticket-similarity', {
    // Vector database settings
    vectorDb: {
        collectionName: 'rcaresolved',  // Use RCA resolved collection
        vectorSize: 768,           // Gemini embedding size
        topK: 20                   // Initial retrieval count
    },
    
    // Response settings
    response: {
        minConfidenceScore: 0.7,   // 70% minimum confidence
        maxResults: 5
    },
    
    // Text processing with ticket-specific field weights
    textProcessing: {
        fieldWeights: {
            short_description: 0.35,
            description: 0.35,
            category: 0.20,
            source: 0.10
        }
    },
    
    // Validation schema for ticket input
    validation: {
        requiredFields: ['source', 'short_description', 'description', 'category'],
        optionalFields: ['ticket_id'],
        textLimits: {
            short_description: { min: 5, max: 500 },
            description: { min: 10, max: 5000 }
        }
    },
    
    // API endpoints
    endpoints: {
        findSimilarTickets: '/api/tickets/similar',
        health: '/api/tickets/similarity/health'
    }
});

module.exports = config;
