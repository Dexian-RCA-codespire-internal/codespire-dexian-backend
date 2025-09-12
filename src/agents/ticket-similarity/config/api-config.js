/**
 * API Configuration for Ticket Similarity Agent
 * Configures endpoints, request/response formats, and validation
 */

const API_CONFIG = {
    // Endpoint configuration
    endpoints: {
        findSimilarTickets: '/api/tickets/similar'
    },

    // Request validation schema
    requestSchema: {
        ticket_id: { type: 'string', required: false },
        source: { type: 'string', required: true },
        short_description: { type: 'string', required: true },
        description: { type: 'string', required: true },
        category: { type: 'string', required: true }
    },

    // Response configuration
    response: {
        minConfidenceScore: 0.4, // 60% minimum confidence
        maxResults: 10,
        fields: [
            'ticket_id', 'source', 'short_description', 'description', 'category', 
            'subcategory', 'status', 'priority', 'impact', 'urgency',
            'opened_time', 'closed_time', 'resolved_time',
            'assigned_to', 'assignment_group', 'company', 'location', 'tags',
            'confidence_score'
        ]
    },

    // Similarity configuration
    similarity: {
        // Weight for each field in similarity calculation
        fieldWeights: {
            short_description: 0.35,
            description: 0.35,
            category: 0.20,
            source: 0.10
        },
        // Similarity methods
        methods: {
            semantic: 'cosine', // cosine, euclidean, dot_product
            hybrid: true // Use both semantic and lexical matching
        }
    },

    // Vector database configuration
    vectorDb: {
        collectionName: 'ticket', // Changed from 'tickets' to 'ticket' - check if this is where your data is
        indexName: 'ticket_embeddings',
        vectorSize: 768, // Gemini embedding size
        topK: 20 // Initial retrieval count before filtering
    }
};

module.exports = API_CONFIG;
