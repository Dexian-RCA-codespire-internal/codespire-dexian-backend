#!/usr/bin/env node

/**
 * One-Time Migration Script: RCAResolved Collection to Qdrant
 * 
 * This script migrates resolved tickets from MongoDB RCAResolved collection
 * to a separate Qdrant collection called 'rcaresolved' for similarity search.
 * 
 * Usage: 
 *   node scripts/migrate-rca-to-qdrant.js --dry-run  (preview)
 *   node scripts/migrate-rca-to-qdrant.js            (actual migration)
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models and services
const RCAResolved = require('../src/models/RCAResolved');
const ticketVectorizationServiceInstance = require('../src/services/ticketVectorizationService');

// Database connection
const MONGODB_URI = 'mongodb://localhost:27017/dexian-rca-local/rcaresolved';

// Global variables
let rcaVectorizationService = null;
let isDryRun = false;

/**
 * Custom RCA Vectorization Service that uses existing infrastructure
 * but with 'rcaresolved' collection and enhanced field weights
 */
class RCAVectorizationService {
    constructor() {
        this.embeddings = null;
        this.qdrantClient = null;
        this.initialized = false;
        // Configuration for RCA resolved vectorization
        this.config = {
            vectorDb: {
                collectionName: 'rcaresolved', // Different collection
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
     * Initialize using existing shared components
     */
    async initialize() {
        try {
            if (this.initialized) return;

            console.log('🚀 Initializing RCA Vectorization Service...');

            // Use existing shared components
            const { providers, vectorStore, utils } = require('../src/agents/shared');
            const { createEmbeddings } = providers.embedding;
            const { ensureCollection } = vectorStore.qdrant;
            const { getQdrantInstance } = require('../src/config/database');

            // Initialize embeddings using shared utility
            this.embeddings = createEmbeddings();
            
            // Initialize Qdrant client
            const qdrantInstance = getQdrantInstance();
            if (!qdrantInstance) {
                throw new Error('Qdrant instance not available. Make sure Qdrant is running and ENABLE_QDRANT is not set to false.');
            }
            
            // Get the actual Qdrant client from the instance
            this.qdrantClient = qdrantInstance.getClient();
            if (!this.qdrantClient) {
                throw new Error('Qdrant client not available. Make sure Qdrant is properly connected.');
            }
            
            // Test Qdrant connection
            try {
                await this.qdrantClient.getCollections();
                console.log('✅ Qdrant connection verified');
            } catch (error) {
                throw new Error(`Qdrant connection failed: ${error.message}`);
            }
            
            // Ensure RCA resolved collection exists
            await ensureCollection(
                this.qdrantClient,
                this.config.vectorDb.collectionName,
                this.config.vectorDb.vectorSize
            );

            this.initialized = true;
            console.log('✅ RCA Vectorization Service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize RCA Vectorization Service:', error.message);
            throw error;
        }
    }

    /**
     * Create text representation for RCA resolved ticket embedding
     */
    createTicketText(ticket) {
        const { createWeightedText } = require('../src/agents/shared/utils/text-processing');
        return createWeightedText(ticket, this.config.textProcessing.fieldWeights, {
            addFieldLabels: true,
            multiplier: 10
        });
    }

    /**
     * Create clean payload for Qdrant
     */
    createCleanTicketPayload(ticket, mongoId) {
        return {
            // Ticket identification
            ticket_id: ticket.ticket_id,        // Use ticket_id for search compatibility
            ticket_number: ticket.ticket_number, // Keep ticket_number for reference
            source: ticket.source,
            sys_id: ticket.sys_id,
            
            // Ticket details
            short_description: ticket.short_description,
            description: ticket.description,
            category: ticket.category,
            priority: ticket.priority,
            impact: ticket.impact,
            urgency: ticket.urgency,
            
            // Resolution data
            root_cause: ticket.root_cause,
            close_code: ticket.close_code,
            customer_summary: ticket.customer_summary,
            problem_statement: ticket.problem_statement,
            resolution_analysis: ticket.resolution_analysis,
            
            // Resolution metadata
            resolved_by: ticket.resolved_by,
            resolved_at: ticket.resolved_at,
            resolution_method: ticket.resolution_method,
            
            // Processing metadata
            processing_time_ms: ticket.processing_time_ms,
            agent_version: ticket.agent_version,
            
            // Additional metadata
            tags: ticket.tags || [],
            notes: ticket.notes,
            
            // Reference to MongoDB
            mongoId: mongoId.toString(),
            
            // Timestamps
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt
        };
    }

    /**
     * Vectorize and store a single RCA ticket in Qdrant
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

            console.log(`🔄 Vectorizing RCA ticket: ${ticket.ticket_id}`);

            // Generate embedding
            const embedding = await this.embeddings.embedQuery(ticketText);

            // Create clean ticket payload
            const ticketPayload = this.createCleanTicketPayload(ticket, mongoId);

            // Store in Qdrant using shared utility
            const { storeDocuments } = require('../src/agents/shared/vector-store/qdrant-utils');
            await storeDocuments(this.qdrantClient, this.config.vectorDb.collectionName, [{
                vector: embedding,
                payload: ticketPayload
            }]);

            console.log(`✅ Successfully vectorized and stored RCA ticket: ${ticket.ticket_id}`);
            return { success: true };

        } catch (error) {
            console.error(`❌ Error vectorizing RCA ticket ${ticket.ticket_id}:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

/**
 * Initialize connections and services
 */
async function initialize() {
    try {
        console.log('🔧 Initializing migration script...');
        
        // Initialize database connections (including MongoDB and Qdrant)
        console.log('🔧 Initializing database connections...');
        const { initializeDatabase } = require('../src/config/database');
        await initializeDatabase();
        console.log('✅ Database connections initialized');
        
        // Initialize RCA vectorization service
        console.log('🧠 Initializing RCA vectorization service...');
        rcaVectorizationService = new RCAVectorizationService();
        await rcaVectorizationService.initialize();
        console.log('✅ RCA vectorization service initialized');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        throw error;
    }
}

/**
 * Create RCA-specific ticket data for vectorization
 */
function createRCATicketData(rcaTicket) {
    // Validate required fields before creating ticket data
    // Note: We can use _id as fallback for ticket_id, so no need to validate ticket_number/sys_id
    if (!rcaTicket.source) {
        throw new Error(`Missing source for RCA ticket ${rcaTicket._id}`);
    }
    if (!rcaTicket.short_description) {
        throw new Error(`Missing short_description for RCA ticket ${rcaTicket._id}`);
    }
    if (!rcaTicket.category) {
        throw new Error(`Missing category for RCA ticket ${rcaTicket._id}`);
    }

    // Convert RCA resolved ticket to format expected by vectorization service
    return {
        ticket_id: rcaTicket.ticket_number || rcaTicket.sys_id || rcaTicket._id.toString(), // Use ticket_number as primary, sys_id as fallback, _id as last resort
        source: rcaTicket.source,
        short_description: rcaTicket.short_description,
        description: rcaTicket.description || '', // Ensure description is never null
        category: rcaTicket.category,
        priority: rcaTicket.priority,
        impact: rcaTicket.impact,
        urgency: rcaTicket.urgency,
        sys_id: rcaTicket.sys_id,
        // Add resolution data as additional fields
        root_cause: rcaTicket.root_cause,
        resolution_analysis: rcaTicket.resolution_analysis,
        customer_summary: rcaTicket.customer_summary,
        close_code: rcaTicket.close_code,
        resolved_at: rcaTicket.resolved_at,
        resolved_by: rcaTicket.resolved_by,
        resolution_method: rcaTicket.resolution_method,
        processing_time_ms: rcaTicket.processing_time_ms,
        agent_version: rcaTicket.agent_version,
        tags: rcaTicket.tags || [],
        notes: rcaTicket.notes
    };
}

/**
 * Migrate a single RCA resolved ticket to Qdrant
 */
async function migrateRCATicket(rcaTicket) {
    try {
        console.log(`🔄 Vectorizing RCA ticket: ${rcaTicket.ticket_number}`);
        
        if (!isDryRun) {
            // Convert RCA ticket to format expected by vectorization service
            const ticketData = createRCATicketData(rcaTicket);
            
            // Use RCA vectorization service
            const result = await rcaVectorizationService.vectorizeAndStoreTicket(ticketData, rcaTicket._id);
            
            if (!result.success) {
                console.log(`⚠️ Failed to vectorize RCA ticket ${rcaTicket.ticket_number}: ${result.reason || result.error}`);
                return { success: false, reason: result.reason || result.error };
            }
        }
        
        console.log(`✅ Successfully migrated RCA ticket: ${rcaTicket.ticket_number}`);
        return { success: true };
        
    } catch (error) {
        console.error(`❌ Error migrating RCA ticket ${rcaTicket.ticket_number}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Main migration function
 */
async function migrateRCAToQdrant() {
    try {
        console.log('🚀 Starting RCA to Qdrant migration...');
        console.log(`📊 Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`);
        
        // Get total count
        const totalCount = await RCAResolved.countDocuments();
        console.log(`📈 Total RCA resolved tickets to migrate: ${totalCount}`);
        
        if (totalCount === 0) {
            console.log('⚠️ No RCA resolved tickets found in MongoDB');
            return;
        }
        
        // Get all RCA resolved tickets
        console.log('📥 Fetching RCA resolved tickets from MongoDB...');
        const rcaTickets = await RCAResolved.find({}).lean();
        console.log(`✅ Fetched ${rcaTickets.length} RCA resolved tickets`);
        
        // Migration statistics
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // Process tickets in batches
        const batchSize = 10;
        for (let i = 0; i < rcaTickets.length; i += batchSize) {
            const batch = rcaTickets.slice(i, i + batchSize);
            
            console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rcaTickets.length / batchSize)} (${batch.length} tickets)`);
            
            // Process batch
            for (const rcaTicket of batch) {
                const result = await migrateRCATicket(rcaTicket);
                
                if (result.success) {
                    migratedCount++;
                } else if (result.reason === 'No text content') {
                    skippedCount++;
                } else {
                    errorCount++;
                }
                
                // Add small delay to avoid overwhelming services
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Progress update
            const processed = Math.min(i + batchSize, rcaTickets.length);
            console.log(`📊 Progress: ${processed}/${rcaTickets.length} tickets processed`);
        }
        
        // Final statistics
        console.log('\n🎉 Migration completed!');
        console.log('📊 Final Statistics:');
        console.log(`   ✅ Successfully migrated: ${migratedCount}`);
        console.log(`   ⚠️ Skipped (no content): ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📈 Total processed: ${migratedCount + skippedCount + errorCount}`);
        
        if (isDryRun) {
            console.log('\n🔍 This was a DRY RUN - no data was actually migrated');
            console.log('💡 Run without --dry-run to perform actual migration');
        } else {
            console.log('\n✅ Migration completed successfully!');
            console.log(`🔍 RCA resolved tickets are now available in Qdrant collection: 'rcaresolved'`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        isDryRun = args.includes('--dry-run');
        
        console.log('🎯 RCA Resolved to Qdrant Migration Script');
        console.log('==========================================');
        
        // Initialize
        await initialize();
        
        // Run migration
        await migrateRCAToQdrant();
        
    } catch (error) {
        console.error('💥 Script failed:', error.message);
        process.exit(1);
    } finally {
        // Cleanup
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('📊 Disconnected from MongoDB');
        }
        console.log('🏁 Script completed');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    migrateRCAToQdrant,
    createRCATicketData,
    RCAVectorizationService
};
