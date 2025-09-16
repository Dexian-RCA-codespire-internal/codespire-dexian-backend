/**
 * Ticket Vectorization Service - Refactored
 * Handles vectorization and storage of tickets in Qdrant for similarity search
 * Now uses shared components for consistency
 */

const crypto = require('crypto');
const { getQdrantInstance } = require('../config/database');
const { providers, vectorStore, utils } = require('../agents/shared');

// Extract specific functions from organized modules
const { createEmbeddings } = providers.embedding;
const { ensureCollection, storeDocuments } = vectorStore.qdrant;
const { createWeightedText } = utils.textProcessing;
const { createSuccessResponse, createErrorResponse, createHealthResponse } = utils.responseFormatting;

class TicketVectorizationService {
    constructor() {
        this.embeddings = null;
        this.qdrantClient = null;
        this.initialized = false;
        // Configuration for ticket vectorization
        this.config = {
            vectorDb: {
                collectionName: 'ticket',
                vectorSize: 768
            },
            textProcessing: {
                fieldWeights: {
                    short_description: 0.35,
                    description: 0.35,
                    category: 0.20,
                    source: 0.10
                }
            }
        };
    }

    /**
     * Initialize the vectorization service using shared components
     */
    async initialize() {
        try {
            if (this.initialized) return;

            console.log('🚀 Initializing Ticket Vectorization Service...');

            // Initialize embeddings using shared utility
            this.embeddings = createEmbeddings();
            
            // Get Qdrant client
            const qdrantInstance = getQdrantInstance();
            if (!qdrantInstance) {
                throw new Error('Qdrant instance not available');
            }
            this.qdrantClient = qdrantInstance.getClient();

            // Ensure collection exists using shared utility
            await ensureCollection(
                this.qdrantClient,
                this.config.vectorDb.collectionName,
                this.config.vectorDb.vectorSize
            );

            this.initialized = true;
            console.log('✅ Ticket Vectorization Service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Ticket Vectorization Service:', error);
            throw error;
        }
    }

    // Note: ensureCollectionExists() is now handled by shared utility in initialize()

    /**
     * Create text representation for embedding using shared utility
     */
    createTicketText(ticket) {
        // Use shared utility for consistent text processing
        return createWeightedText(ticket, this.config.textProcessing.fieldWeights);
    }

    /**
     * Create clean ticket payload for Qdrant (excluding raw field and nested objects)
     */
    createCleanTicketPayload(ticket, mongoId) {
        // Helper function to safely extract string values from objects
        const extractValue = (field) => {
            if (!field) return null;
            if (typeof field === 'string') return field;
            if (typeof field === 'object' && field.id) return field.id;
            if (typeof field === 'object' && field.value) return field.value;
            if (typeof field === 'object' && field.sys_id) return field.sys_id;
            return String(field);
        };

        // Helper function to format dates properly
        const formatDate = (dateField) => {
            if (!dateField) return null;
            if (dateField instanceof Date) return dateField.toISOString();
            if (typeof dateField === 'object' && dateField.$date) return new Date(dateField.$date).toISOString();
            if (typeof dateField === 'string') return new Date(dateField).toISOString();
            return null;
        };

        return {
            mongoId: mongoId.toString(),
            ticket_id: ticket.ticket_id || null,
            source: ticket.source || null,
            short_description: ticket.short_description || null,
            description: ticket.description || null,
            category: ticket.category || null,
            subcategory: ticket.subcategory || null,
            status: ticket.status || null,
            priority: ticket.priority || null,
            impact: ticket.impact || null,
            urgency: ticket.urgency || null,
            opened_time: formatDate(ticket.opened_time),
            closed_time: formatDate(ticket.closed_time),
            resolved_time: formatDate(ticket.resolved_time),
            requester_id: extractValue(ticket.requester),
            assigned_to_id: extractValue(ticket.assigned_to),
            assignment_group_id: extractValue(ticket.assignment_group),
            company_id: extractValue(ticket.company),
            location_id: extractValue(ticket.location),
            tags: Array.isArray(ticket.tags) ? ticket.tags : []
            // Note: 'raw' field and complex nested objects are intentionally excluded
        };
    }

    /**
     * Vectorize and store a single ticket in Qdrant
     */
    async vectorizeAndStoreTicket(ticket, mongoId) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Validate required fields
            if (!ticket.ticket_id || !ticket.source) {
                console.log(`⚠️ Skipping ticket - missing required fields (ticket_id: ${ticket.ticket_id}, source: ${ticket.source})`);
                return { success: false, reason: 'Missing required fields' };
            }

            // Create text representation for embedding
            const ticketText = this.createTicketText(ticket);
            
            if (!ticketText.trim()) {
                console.log(`⚠️ Skipping ticket ${ticket.ticket_id} - no text content for embedding`);
                return { success: false, reason: 'No text content' };
            }

            console.log(`🔄 Vectorizing ticket: ${ticket.ticket_id}`);

            // Generate embedding
            const embedding = await this.embeddings.embedQuery(ticketText);

            // Create clean ticket payload (excluding raw field)
            const ticketPayload = this.createCleanTicketPayload(ticket, mongoId);

            // Create Qdrant point with UUID (Qdrant doesn't accept MongoDB ObjectId format)
            const pointId = crypto.randomUUID(); // Generate a proper UUID for Qdrant
            
            const point = {
                id: pointId,
                vector: embedding,
                payload: {
                    ...ticketPayload,
                    mongoId: mongoId.toString() // Keep MongoDB ID in payload for reference
                }
            };

            // Store in Qdrant using shared utility
            await storeDocuments(this.qdrantClient, this.config.vectorDb.collectionName, [{
                vector: embedding,
                payload: {
                    ...ticketPayload,
                    mongoId: mongoId.toString()
                }
            }]);

            console.log(`✅ Successfully vectorized and stored ticket: ${ticket.ticket_id}`);
            return { success: true, ticket_id: ticket.ticket_id };

        } catch (error) {
            console.error(`❌ Error vectorizing ticket ${ticket.ticket_id}:`, error);
            return { success: false, error: error.message, ticket_id: ticket.ticket_id };
        }
    }

    /**
     * Vectorize and store multiple tickets in batch
     */
    async vectorizeAndStoreTicketsBatch(tickets, mongoIds) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log(`🔄 Vectorizing ${tickets.length} tickets in batch...`);

            const points = [];
            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            // Process tickets in batches to avoid overwhelming the API
            const batchSize = 10;
            for (let i = 0; i < tickets.length; i += batchSize) {
                const batch = tickets.slice(i, i + batchSize);
                const batchMongoIds = mongoIds.slice(i, i + batchSize);

                const batchPromises = batch.map(async (ticket, index) => {
                    const mongoId = batchMongoIds[index];
                    const ticketText = this.createTicketText(ticket);
                    
                    if (!ticketText.trim()) {
                        results.failed++;
                        results.errors.push({
                            ticket_id: ticket.ticket_id,
                            error: 'No text content for embedding'
                        });
                        return null;
                    }

                    try {
                        const embedding = await this.embeddings.embedQuery(ticketText);
                        
                        // Use the same clean payload method to exclude raw field
                        const ticketPayload = this.createCleanTicketPayload(ticket, mongoId);

                        // Generate UUID for Qdrant point ID
                        const pointId = crypto.randomUUID();
                        
                        return {
                            id: pointId,
                            vector: embedding,
                            payload: {
                                ...ticketPayload,
                                mongoId: mongoId.toString() // Keep MongoDB ID in payload for reference
                            }
                        };
                    } catch (error) {
                        results.failed++;
                        results.errors.push({
                            ticket_id: ticket.ticket_id,
                            error: error.message
                        });
                        return null;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                const validPoints = batchResults.filter(point => point !== null);
                points.push(...validPoints);
                results.successful += validPoints.length;

                // Add delay between batches to avoid rate limiting
                if (i + batchSize < tickets.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Store all points in Qdrant using shared utility
            if (points.length > 0) {
                const documents = points.map(point => ({
                    vector: point.vector,
                    payload: point.payload
                }));
                
                await storeDocuments(this.qdrantClient, this.config.vectorDb.collectionName, documents);
                console.log(`✅ Successfully stored ${points.length} vectors in Qdrant`);
            }

            console.log(`📊 Batch vectorization completed: ${results.successful} successful, ${results.failed} failed`);
            return results;

        } catch (error) {
            console.error('❌ Error in batch vectorization:', error);
            throw error;
        }
    }

    /**
     * Remove ticket from Qdrant by MongoDB ID
     * Note: Since we use UUIDs as Qdrant point IDs, we need to search by mongoId in payload
     */
    async removeTicketFromQdrant(mongoId) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Search for points with matching mongoId in payload
            const searchResults = await this.qdrantClient.scroll(this.config.vectorDb.collectionName, {
                filter: {
                    must: [
                        {
                            key: "mongoId",
                            match: { value: mongoId.toString() }
                        }
                    ]
                },
                limit: 1,
                with_payload: false,
                with_vector: false
            });

            if (searchResults.points && searchResults.points.length > 0) {
                const pointIds = searchResults.points.map(point => point.id);
                
                await this.qdrantClient.delete(this.config.vectorDb.collectionName, {
                    wait: true,
                    points: pointIds
                });

                console.log(`✅ Removed ticket ${mongoId} from Qdrant (${pointIds.length} points)`);
                return { success: true, removedPoints: pointIds.length };
            } else {
                console.log(`⚠️ No Qdrant points found for MongoDB ID ${mongoId}`);
                return { success: true, removedPoints: 0 };
            }

        } catch (error) {
            console.error(`❌ Error removing ticket ${mongoId} from Qdrant:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Health check for the vectorization service using shared utility
     */
    async healthCheck() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Test embedding generation
            await this.embeddings.embedQuery('test');
            
            // Test Qdrant connection
            await this.qdrantClient.getCollections();

            return createHealthResponse('healthy', {
                embeddings: 'healthy',
                qdrant: 'healthy',
                vectorization: 'healthy'
            });
        } catch (error) {
            return createHealthResponse('unhealthy', {
                embeddings: 'failed',
                qdrant: 'failed',
                vectorization: 'failed',
                error: error.message
            });
        }
    }
}

// Export singleton instance
module.exports = new TicketVectorizationService();

