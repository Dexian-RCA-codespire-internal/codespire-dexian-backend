/**
 * RCA Generation Agent Configuration
 * Configuration for Root Cause Analysis generation functionality
 */

const { config: defaultConfig } = require('../shared');

// Create RCA generation configuration
const config = defaultConfig.createRAGAgentConfig('rca-generation', {
    // LLM settings for technical RCA generation
    llm: {
        model: 'gemini-1.5-flash',
        temperature: 0.4,
        maxTokens: 2000
    },
    
    // Streaming settings
    streaming: {
        enabled: true,
        chunkSize: 50, // Characters per chunk for streaming
        delay: 100 // Milliseconds delay between chunks
    },
    
    // Response settings
    response: {
        maxTechnicalRcaLength: 1000,
        minTechnicalRcaLength: 500,
        maxCustomerSummaryLength: 500,
        minCustomerSummaryLength: 100
    },
    
    // RCA Structure Template
    rcaStructure: {
        sections: [
            'Issue Identification',
            'Findings',
            'Additional RCA Detail',
            'Corrective Action Plan'
        ],
        requiredFields: [
            'problem',
            'timeline', 
            'impact',
            'rootCause',
            'correctiveActions'
        ]
    },
    
    // Validation schema for RCA generation input
    validation: {
        requiredFields: ['ticketData', 'problem', 'timeline', 'impact', 'rootCause', 'correctiveActions'],
        textLimits: {
            problem: { min: 10, max: 1000 },
            timeline: { min: 10, max: 1000 },
            impact: { min: 10, max: 1000 },
            rootCause: { min: 10, max: 1000 },
            correctiveActions: { min: 10, max: 1000 }
        }
    },
    
    // API endpoints
    endpoints: {
        generateRca: '/api/rca/generate',
        streamRca: '/api/rca/stream',
        health: '/api/rca/health'
    },

    // WebSocket events
    websocket: {
        events: {
            rcaGeneration: 'rca_generation',
            rcaProgress: 'rca_progress',
            rcaComplete: 'rca_complete',
            rcaError: 'rca_error'
        },
        rooms: {
            rcaGeneration: 'rca-generation'
        }
    }
});

module.exports = config;
