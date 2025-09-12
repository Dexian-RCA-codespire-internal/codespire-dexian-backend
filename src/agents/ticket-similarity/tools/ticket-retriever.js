/**
 * Ticket Retriever Tool
 * Handles vector search and similarity calculation for tickets
 */

const { QdrantVectorStore } = require('@langchain/qdrant');
const { ProviderFactory } = require('../config/langchain-providers');
const API_CONFIG = require('../config/api-config');
const qdrantService = require('../../../services/qdrantService');

class TicketRetriever {
    constructor(embeddingProvider = 'gemini') {
        this.embeddingProvider = embeddingProvider;
        this.embeddings = null;
        this.vectorStore = null;
        this.qdrantClient = null;
    }

    /**
     * Initialize the retriever with embedding provider and vector store
     */
    async initialize() {
        try {
            // Initialize embeddings
            this.embeddings = ProviderFactory.getEmbeddingProvider(this.embeddingProvider);
            
            // Get Qdrant client
            this.qdrantClient = qdrantService.getClient();
            
            // Initialize vector store
            this.vectorStore = await QdrantVectorStore.fromExistingCollection(
                this.embeddings,
                {
                    client: this.qdrantClient,
                    collectionName: API_CONFIG.vectorDb.collectionName
                }
            );

            console.log('TicketRetriever initialized successfully');
        } catch (error) {
            console.error('Failed to initialize TicketRetriever:', error);
            throw error;
        }
    }

    /**
     * Create a combined text representation of a ticket for embedding
     */
    createTicketText(ticket) {
        const weights = API_CONFIG.similarity.fieldWeights;
        
        // Create weighted text based on field importance
        const parts = [];
        
        if (ticket.short_description) {
            // Repeat short_description based on its weight to give it more importance
            const repeatCount = Math.ceil(weights.short_description * 10);
            for (let i = 0; i < repeatCount; i++) {
                parts.push(ticket.short_description);
            }
        }
        
        if (ticket.description) {
            const repeatCount = Math.ceil(weights.description * 10);
            for (let i = 0; i < repeatCount; i++) {
                parts.push(ticket.description);
            }
        }
        
        if (ticket.category) {
            const repeatCount = Math.ceil(weights.category * 10);
            for (let i = 0; i < repeatCount; i++) {
                parts.push(`Category: ${ticket.category}`);
            }
        }
        
        if (ticket.source) {
            const repeatCount = Math.ceil(weights.source * 10);
            for (let i = 0; i < repeatCount; i++) {
                parts.push(`Source: ${ticket.source}`);
            }
        }
        
        return parts.join(' ');
    }

    /**
     * Parse ticket data from pageContent if metadata is missing
     */
    parseTicketFromContent(pageContent, existingMetadata = {}) {
        // This is a fallback parser - adjust based on your data format
        if (!pageContent) return existingMetadata;
        
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(pageContent);
            return { ...existingMetadata, ...parsed };
        } catch (e) {
            // If not JSON, return what we have with pageContent as description
            return {
                ...existingMetadata,
                description: pageContent,
                ticket_id: existingMetadata.ticket_id || 'PARSED_FROM_CONTENT',
                source: existingMetadata.source || 'UNKNOWN',
                short_description: existingMetadata.short_description || pageContent.substring(0, 100),
                category: existingMetadata.category || 'UNKNOWN'
            };
        }
    }

    /**
     * Calculate field-specific similarity scores
     */
    calculateFieldSimilarity(queryTicket, candidateTicket) {
        const similarities = {};
        
        // Simple text similarity calculation (can be enhanced with more sophisticated methods)
        const calculateTextSimilarity = (text1, text2) => {
            if (!text1 || !text2) return 0;
            
            const words1 = text1.toLowerCase().split(/\s+/);
            const words2 = text2.toLowerCase().split(/\s+/);
            
            const set1 = new Set(words1);
            const set2 = new Set(words2);
            
            const intersection = new Set([...set1].filter(x => set2.has(x)));
            const union = new Set([...set1, ...set2]);
            
            return intersection.size / union.size; // Jaccard similarity
        };

        similarities.short_description = calculateTextSimilarity(
            queryTicket.short_description, 
            candidateTicket.short_description
        );
        
        similarities.description = calculateTextSimilarity(
            queryTicket.description, 
            candidateTicket.description
        );
        
        // Exact match for category and source
        similarities.category = (queryTicket.category === candidateTicket.category) ? 1.0 : 0.0;
        similarities.source = (queryTicket.source === candidateTicket.source) ? 1.0 : 0.0;
        
        return similarities;
    }

    /**
     * Calculate weighted similarity score
     */
    calculateWeightedScore(fieldSimilarities, semanticScore) {
        const weights = API_CONFIG.similarity.fieldWeights;
        
        // Convert semantic score to a 0-1 range if it's a cosine similarity
        // Cosine similarity ranges from -1 to 1, we normalize to 0-1
        let normalizedSemanticScore = semanticScore;
        if (semanticScore < 0) {
            normalizedSemanticScore = 0; // Treat negative similarities as 0
        } else if (semanticScore <= 1) {
            // Assume it's already in 0-1 range or cosine similarity
            normalizedSemanticScore = Math.max(0, semanticScore);
        } else {
            // If score is > 1, it might be a distance metric, convert accordingly
            normalizedSemanticScore = 1 / (1 + semanticScore);
        }
        
        // Combine field-specific similarities with weights
        const fieldScore = 
            (fieldSimilarities.short_description * weights.short_description) +
            (fieldSimilarities.description * weights.description) +
            (fieldSimilarities.category * weights.category) +
            (fieldSimilarities.source * weights.source);
        
        // Combine semantic score with field-specific score (70% semantic, 30% field-specific)
        const finalScore = (normalizedSemanticScore * 0.7) + (fieldScore * 0.3);
        
        return Math.min(Math.max(finalScore, 0), 1.0); // Ensure score is between 0 and 1
    }

    /**
     * Retrieve similar tickets based on input ticket
     */
    async retrieveSimilarTickets(queryTicket) {
        try {
            if (!this.vectorStore) {
                await this.initialize();
            }

            // Create text representation for embedding
            const queryText = this.createTicketText(queryTicket);
            console.log('🔍 Debug: Query text for embedding:', queryText);
            console.log('🔍 Debug: Query ticket:', JSON.stringify(queryTicket, null, 2));
            
            // Get embedding for the query text
            const queryEmbedding = await this.embeddings.embedQuery(queryText);
            console.log('🔍 Debug: Query embedding generated, length:', queryEmbedding.length);
            
            // Use Qdrant client directly to search with proper payload retrieval
            const searchResults = await this.qdrantClient.search(API_CONFIG.vectorDb.collectionName, {
                vector: queryEmbedding,
                limit: API_CONFIG.vectorDb.topK,
                with_payload: true,
                with_vector: false
            });
            
            console.log('🔍 Debug: Raw Qdrant search results count:', searchResults.length);
            if (searchResults.length > 0) {
                console.log('🔍 Debug: First few raw results:');
                searchResults.slice(0, 3).forEach((result, index) => {
                    console.log(`  ${index + 1}. Score: ${result.score}`);
                    console.log(`     Payload keys: ${Object.keys(result.payload || {}).join(', ')}`);
                    console.log(`     Ticket ID: ${result.payload?.ticket_id}`);
                    console.log(`     Short Description: ${result.payload?.short_description?.substring(0, 50)}...`);
                });
            }

            // Process and enhance results with field-specific similarity
            const enhancedResults = searchResults.map((result) => {
                const semanticScore = result.score;
                const candidateTicket = result.payload || {};
                
                console.log('🔍 Debug: Processing Qdrant result:', {
                    hasPayload: !!result.payload,
                    payloadKeys: Object.keys(result.payload || {}),
                    ticket_id: candidateTicket.ticket_id,
                    source: candidateTicket.source,
                    short_description: candidateTicket.short_description,
                    category: candidateTicket.category,
                    hasAllFields: !!(candidateTicket.ticket_id && candidateTicket.short_description && candidateTicket.description)
                });
                
                // Calculate field-specific similarities
                const fieldSimilarities = this.calculateFieldSimilarity(queryTicket, candidateTicket);
                
                // Calculate final weighted score
                const confidence_score = this.calculateWeightedScore(fieldSimilarities, semanticScore);
                
                // Format dates properly
                const formatDate = (dateObj) => {
                    if (!dateObj) return null;
                    if (dateObj.$date) return new Date(dateObj.$date).toISOString();
                    return dateObj;
                };
                
                return {
                    ticket_id: candidateTicket.ticket_id,
                    source: candidateTicket.source,
                    short_description: candidateTicket.short_description,
                    description: candidateTicket.description,
                    category: candidateTicket.category,
                    subcategory: candidateTicket.subcategory,
                    status: candidateTicket.status,
                    priority: candidateTicket.priority,
                    impact: candidateTicket.impact,
                    urgency: candidateTicket.urgency,
                    opened_time: formatDate(candidateTicket.opened_time),
                    closed_time: formatDate(candidateTicket.closed_time),
                    resolved_time: formatDate(candidateTicket.resolved_time),
                    assigned_to: candidateTicket.assigned_to,
                    assignment_group: candidateTicket.assignment_group,
                    company: candidateTicket.company,
                    location: candidateTicket.location,
                    tags: candidateTicket.tags,
                    confidence_score: Math.round(confidence_score * 100) / 100,
                    semantic_score: Math.round(semanticScore * 100) / 100,
                    field_similarities: fieldSimilarities
                };
            });

            return enhancedResults;
        } catch (error) {
            console.error('Error retrieving similar tickets:', error);
            throw error;
        }
    }

    /**
     * Health check for the retriever
     */
    async healthCheck() {
        try {
            if (!this.vectorStore) {
                await this.initialize();
            }
            
            // Simple test query
            const testResults = await this.vectorStore.similaritySearch("test query", 1);
            return { status: 'healthy', results_count: testResults.length };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
}

module.exports = TicketRetriever;
