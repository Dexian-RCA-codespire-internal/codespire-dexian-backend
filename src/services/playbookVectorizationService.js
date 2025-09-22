// new file servicenow
/**
 * Playbook Vectorization Service
 * Handles vector storage and retrieval for playbooks using shared embedding configurations
 */

const { createEmbeddings, embedText, getEmbeddingDimension } = require('../agents/shared/providers/embedding-provider');
const { createRAGAgentConfig } = require('../agents/shared/config/default-config');
const { ensureCollection, storeDocument, searchSimilar, deleteDocumentsByFilter } = require('../agents/shared/vector-store/qdrant-utils');
const qdrantService = require('./qdrantService');

class PlaybookVectorizationService {
    constructor() {
        this.config = null;
        this.embeddings = null;
        this.collectionName = 'playbooks';
        this.initialized = false;
    }

    /**
     * Initialize the vectorization service with configuration
     */
    async initialize() {
        try {
            if (this.initialized) {
                return { success: true, message: 'Service already initialized' };
            }

            // Create configuration for playbook vectorization
            this.config = createRAGAgentConfig('playbook', {
                vectorDb: {
                    collectionName: this.collectionName,
                    vectorSize: 768, // Gemini default
                    distance: 'Cosine',
                    topK: 20
                },
                textProcessing: {
                    fieldWeights: {
                        title: 0.3,
                        description: 0.4,
                        steps: 0.2,
                        tags: 0.1
                    }
                }
            });

            // Initialize embeddings
            this.embeddings = createEmbeddings(this.config.providers.embedding);
            
            // Ensure Qdrant collection exists
            const qdrantClient = qdrantService.getClient();
            await ensureCollection(
                qdrantClient,
                this.collectionName,
                this.config.vectorDb.vectorSize,
                this.config.vectorDb.distance
            );

            this.initialized = true;
            console.log('✅ Playbook vectorization service initialized successfully');
            
            return { success: true, message: 'Service initialized successfully' };
        } catch (error) {
            console.error('❌ Error initializing playbook vectorization service:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Prepare text content for embedding from playbook data
     * @param {Object} playbook - Playbook document
     * @returns {string} Combined text for embedding
     */
    prepareTextForEmbedding(playbook) {
        const weights = this.config.textProcessing.fieldWeights;
        let combinedText = '';

        // Add title with weight
        if (playbook.title) {
            combinedText += `${playbook.title} `.repeat(Math.ceil(weights.title * 10));
        }

        // Add description with weight
        if (playbook.description) {
            combinedText += `${playbook.description} `.repeat(Math.ceil(weights.description * 10));
        }

        // Add steps with weight
        if (playbook.steps && Array.isArray(playbook.steps)) {
            const stepsText = playbook.steps.map(step => 
                `${step.title || ''} ${step.action || ''} ${step.expected_outcome || ''}`
            ).join(' ');
            combinedText += `${stepsText} `.repeat(Math.ceil(weights.steps * 10));
        }

        // Add tags with weight
        if (playbook.tags && Array.isArray(playbook.tags)) {
            const tagsText = playbook.tags.join(' ');
            combinedText += `${tagsText} `.repeat(Math.ceil(weights.tags * 10));
        }

        // Add outcome
        if (playbook.outcome) {
            combinedText += ` ${playbook.outcome}`;
        }

        return combinedText.trim();
    }

    /**
     * Create payload for vector storage
     * @param {Object} playbook - Playbook document
     * @returns {Object} Payload for vector storage
     */
    createVectorPayload(playbook) {
        return {
            id: playbook._id.toString(),
            playbook_id: playbook.playbook_id,
            title: playbook.title,
            description: playbook.description,
            priority: playbook.priority,
            tags: playbook.tags || [],
            outcome: playbook.outcome,
            created_by: playbook.created_by,
            is_active: playbook.is_active,
            created_at: playbook.createdAt,
            updated_at: playbook.updatedAt,
            source: 'playbook',
            type: 'playbook'
        };
    }

    /**
     * Store playbook in vector database
     * @param {Object} playbook - Playbook document from MongoDB
     * @returns {Promise<Object>} Result of vector storage operation
     */
    async storePlaybookVector(playbook) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Prepare text for embedding
            const textForEmbedding = this.prepareTextForEmbedding(playbook);
            
            if (!textForEmbedding.trim()) {
                return {
                    success: false,
                    error: 'No text content found for embedding'
                };
            }

            // Generate embedding
            const vector = await embedText(this.embeddings, textForEmbedding);
            
            // Create payload
            const payload = this.createVectorPayload(playbook);
            
            // Store in Qdrant
            const qdrantClient = qdrantService.getClient();
            const pointId = await storeDocument(
                qdrantClient,
                this.collectionName,
                vector,
                payload,
                playbook._id.toString()
            );

            console.log(`✅ Playbook vector stored successfully: ${playbook.playbook_id} (Point ID: ${pointId})`);
            
            return {
                success: true,
                pointId: pointId,
                message: 'Playbook vector stored successfully'
            };
        } catch (error) {
            console.error('❌ Error storing playbook vector:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update playbook vector in vector database
     * @param {Object} playbook - Updated playbook document
     * @returns {Promise<Object>} Result of vector update operation
     */
    async updatePlaybookVector(playbook) {
        try {
            // For updates, we'll store the new vector (upsert behavior)
            return await this.storePlaybookVector(playbook);
        } catch (error) {
            console.error('❌ Error updating playbook vector:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete playbook vector from vector database
     * @param {string} playbookId - MongoDB playbook ID
     * @returns {Promise<Object>} Result of vector deletion operation
     */
    async deletePlaybookVector(playbookId) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const qdrantClient = qdrantService.getClient();
            
            // Delete by filter using the MongoDB ID
            await deleteDocumentsByFilter(qdrantClient, this.collectionName, {
                must: [
                    {
                        key: 'id',
                        match: {
                            value: playbookId
                        }
                    }
                ]
            });

            console.log(`✅ Playbook vector deleted successfully: ${playbookId}`);
            
            return {
                success: true,
                message: 'Playbook vector deleted successfully'
            };
        } catch (error) {
            console.error('❌ Error deleting playbook vector:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search for similar playbooks using vector similarity
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async searchSimilarPlaybooks(query, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const {
                topK = this.config.vectorDb.topK,
                minScore = this.config.response.minConfidenceScore,
                filters = {}
            } = options;

            // Generate embedding for query
            const queryVector = await embedText(this.embeddings, query);
            
            // Build filter conditions
            const qdrantFilter = {
                must: [
                    {
                        key: 'is_active',
                        match: {
                            value: true
                        }
                    }
                ]
            };

            // Add additional filters
            if (filters.priority) {
                qdrantFilter.must.push({
                    key: 'priority',
                    match: {
                        value: filters.priority
                    }
                });
            }

            if (filters.tags && filters.tags.length > 0) {
                qdrantFilter.must.push({
                    key: 'tags',
                    match: {
                        any: filters.tags
                    }
                });
            }

            // Search in Qdrant
            const qdrantClient = qdrantService.getClient();
            const results = await searchSimilar(
                qdrantClient,
                this.collectionName,
                queryVector,
                topK,
                qdrantFilter
            );

            // Filter by minimum score and format results
            const filteredResults = results
                .filter(result => result.score >= minScore)
                .map(result => ({
                    playbook_id: result.payload.playbook_id,
                    title: result.payload.title,
                    description: result.payload.description,
                    priority: result.payload.priority,
                    tags: result.payload.tags,
                    outcome: result.payload.outcome,
                    similarity_score: result.score,
                    created_at: result.payload.created_at,
                    updated_at: result.payload.updated_at
                }));

            console.log(`🔍 Vector search completed: ${filteredResults.length} results for query "${query}"`);
            
            return {
                success: true,
                data: filteredResults,
                count: filteredResults.length,
                query: query,
                search_type: 'vector_similarity'
            };
        } catch (error) {
            console.error('❌ Error searching similar playbooks:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get service health status
     * @returns {Promise<Object>} Health status
     */
    async getHealthStatus() {
        try {
            const qdrantHealthy = await qdrantService.isHealthy();
            const embeddingsHealthy = this.embeddings !== null;
            const initialized = this.initialized;

            return {
                success: true,
                data: {
                    qdrant: qdrantHealthy,
                    embeddings: embeddingsHealthy,
                    initialized: initialized,
                    collection_name: this.collectionName,
                    config: this.config ? {
                        provider: this.config.providers.embedding,
                        vector_size: this.config.vectorDb.vectorSize,
                        distance: this.config.vectorDb.distance
                    } : null
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new PlaybookVectorizationService();
