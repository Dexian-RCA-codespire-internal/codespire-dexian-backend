/**
 * Ticket Resolution Agent Configuration
 * Configuration for ticket resolution and RCA (Root Cause Analysis) functionality
 */

const { config: defaultConfig } = require('../shared');

// Create ticket resolution configuration
const config = defaultConfig.createRAGAgentConfig('ticket-resolution', {
    // LLM settings for resolution analysis
    llm: {
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        temperature: 0.3,
        maxTokens: 1000
    },
    
    // Response settings
    response: {
        maxSummaryLength: 500,
        minSummaryLength: 50
    },
    
    // Close codes mapping
    closeCodes: {
        'Duplicate': 'Duplicate',
        'Known error': 'Known error', 
        'No resolution provided': 'No resolution provided',
        'Resolved by caller': 'Resolved by caller',
        'Resolved by change': 'Resolved by change',
        'Resolved by problem': 'Resolved by problem',
        'Resolved by request': 'Resolved by request',
        'Solution provided': 'Solution provided',
        'Workaround provided': 'Workaround provided',
        'User error': 'User error'
    },
    
    // Validation schema for ticket resolution input
    validation: {
        requiredFields: ['rootCause', 'ticket'],
        ticketRequiredFields: ['_id', 'ticket_id', 'source', 'short_description', 'category', 'priority', 'impact', 'urgency', 'raw'],
        textLimits: {
            rootCause: { min: 10, max: 2000 },
            customerSummary: { min: 20, max: 500 }
        }
    },
    
    // API endpoints
    endpoints: {
        resolveTicket: '/api/tickets/resolve',
        health: '/api/tickets/resolution/health'
    }
});

module.exports = config;
