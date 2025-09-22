/**
 * Ticket Suggestion Agent Configuration
 * Dedicated configuration for ticket resolution suggestions
 */

const { config: defaultConfig } = require('../shared');

// Create ticket suggestion configuration using shared utilities
const config = defaultConfig.createRAGAgentConfig('ticket-suggestion', {
    // Suggestion settings
    suggestions: {
        maxSuggestions: 3,        // Always return exactly 3 suggestions
        minTickets: 1,            // Minimum similar tickets required
        maxTickets: 10            // Maximum similar tickets allowed
    },
    
    // LLM settings
    llm: {
        provider: 'gemini',
        temperature: 0.1,         // Low temperature for consistent responses
        maxTokens: 500
    },
    
    // Validation schema for ticket input
    validation: {
        requiredFields: [
            'ticket_id',
            'source', 
            'short_description',
            'category',
            'confidence_score'
        ],
        optionalFields: [
            'description',
            'subcategory',
            'status',
            'priority',
            'impact',
            'urgency',
            'opened_time',
            'closed_time',
            'resolved_time',
            'tags',
            'semantic_score',
            'field_similarities',
            'rank',
            'confidence_percentage'
        ],
        supportedFields: [
            'ticket_id',
            'source',
            'short_description',
            'description',
            'category',
            'subcategory',
            'status',
            'priority',
            'impact',
            'urgency',
            'opened_time',
            'closed_time',
            'resolved_time',
            'assigned_to',
            'assignment_group',
            'company',
            'location',
            'tags',
            'confidence_score',
            'semantic_score',
            'field_similarities',
            'rank',
            'confidence_percentage'
        ]
    },
    
    // API endpoints
    endpoints: {
        generateSuggestions: '/api/v1/ticket-similarity/suggestions',
        health: '/api/v1/ticket-similarity/similarity/health'
    },
    
    // Response formatting
    response: {
        includeMetadata: true,
        includeProcessingTime: true,
        includeCurrentTicket: true
    }
});

module.exports = config;
