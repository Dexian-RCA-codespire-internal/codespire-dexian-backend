#!/usr/bin/env node

/**
 * Vectorize Tickets Script
 * Processes existing tickets and adds vector embeddings to Qdrant
 * Uses multiple Gemini API keys with automatic failover
 * Supports resume from where it left off
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models and services
const Ticket = require('../src/models/Tickets');
const { initializeDatabase } = require('../src/config/database');
const ticketVectorizationService = require('../src/services/ticketVectorizationService');

class TicketVectorizer {
    constructor() {
        // Multiple Gemini API keys for failover
        this.geminiKeys = [
            'AIzaSyDskqSsBtWG5zLQJl7DViEoRSVvQOTDXTo',
            'AIzaSyBnndOaCmXZwcTz6OsCFzn_1Dwit6BeMvI', 
            'AIzaSyBA643TyzxONg2hHphKp-9hSHffh7eQqck',
            'AIzaSyBd9n8G9ihBC_5072ZInJMOcxGNaaZPZNo'
        ];
        
        this.currentKeyIndex = 0;
        this.batchSize = 50; // Smaller batches for reliability
        this.processedCount = 0;
        this.totalTickets = 0;
        this.startTime = Date.now();
        
        // Progress tracking
        this.progressFile = path.join(__dirname, 'vectorization-progress.json');
    }

    /**
     * Initialize database connections
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Ticket Vectorizer...');
            
            // Initialize all databases using the main database configuration
            await initializeDatabase();
            console.log('✅ Database initialization completed');
            
            // Initialize vectorization service
            await ticketVectorizationService.initialize();
            console.log('✅ Vectorization service initialized');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set current Gemini API key
     */
    setCurrentGeminiKey() {
        const currentKey = this.geminiKeys[this.currentKeyIndex];
        process.env.GEMINI_API_KEY = currentKey;
        console.log(`🔑 Using Gemini API key ${this.currentKeyIndex + 1}/${this.geminiKeys.length}`);
        return currentKey;
    }

    /**
     * Switch to next Gemini API key
     */
    switchToNextKey() {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.geminiKeys.length;
        const newKey = this.setCurrentGeminiKey();
        console.log(`🔄 Switched to next Gemini API key`);
        return newKey;
    }

    /**
     * Load progress from file
     */
    loadProgress() {
        try {
            const fs = require('fs');
            if (fs.existsSync(this.progressFile)) {
                const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
                this.processedCount = progress.processedCount || 0;
                this.currentKeyIndex = progress.currentKeyIndex || 0;
                console.log(`📂 Resuming from progress: ${this.processedCount} tickets processed`);
                return true;
            }
        } catch (error) {
            console.log('⚠️ Could not load progress file, starting fresh');
        }
        return false;
    }

    /**
     * Save progress to file
     */
    saveProgress() {
        try {
            const fs = require('fs');
            const progress = {
                processedCount: this.processedCount,
                currentKeyIndex: this.currentKeyIndex,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));
        } catch (error) {
            console.error('⚠️ Could not save progress:', error.message);
        }
    }

    /**
     * Clear progress file
     */
    clearProgress() {
        try {
            const fs = require('fs');
            if (fs.existsSync(this.progressFile)) {
                fs.unlinkSync(this.progressFile);
                console.log('🗑️ Cleared progress file');
            }
        } catch (error) {
            console.error('⚠️ Could not clear progress file:', error.message);
        }
    }

    /**
     * Get tickets that need vectorization
     */
    async getTicketsToVectorize() {
        try {
            // Get total count
            this.totalTickets = await Ticket.countDocuments();
            console.log(`📊 Total tickets in database: ${this.totalTickets}`);
            console.log(`📊 Processed count: ${this.processedCount}`);
            console.log(`📊 Batch size: ${this.batchSize}`);
            
            // Get tickets that haven't been vectorized yet
            // We'll process all tickets and let the vectorization service handle duplicates
            const tickets = await Ticket.find({})
                .skip(this.processedCount)
                .limit(this.batchSize)
                .lean();
            
            console.log(`📋 Processing batch: ${tickets.length} tickets (${this.processedCount + 1}-${this.processedCount + tickets.length})`);
            return tickets;
            
        } catch (error) {
            console.error('❌ Error getting tickets:', error);
            throw error;
        }
    }

    /**
     * Vectorize a batch of tickets
     */
    async vectorizeBatch(tickets) {
        try {
            // Set current API key
            this.setCurrentGeminiKey();
            
            // Create MongoDB IDs for the tickets
            const mongoIds = tickets.map(ticket => ticket._id);
            
            // Vectorize the batch
            const result = await ticketVectorizationService.vectorizeAndStoreTicketsBatch(
                tickets,
                mongoIds
            );
            
            return result;
            
        } catch (error) {
            console.error('❌ Vectorization batch failed:', error);
            
            // If it's an API key issue, try the next key
            if (error.message.includes('API') || error.message.includes('quota') || error.message.includes('limit')) {
                console.log('🔄 API key issue detected, trying next key...');
                this.switchToNextKey();
                throw new Error('API_KEY_ERROR'); // Signal to retry with new key
            }
            
            throw error;
        }
    }

    /**
     * Process all tickets with vectorization
     */
    async processAllTickets() {
        try {
            console.log('🔄 Starting vectorization process...');
            
            // Load progress if available
            this.loadProgress();
            
            // Get total ticket count first
            this.totalTickets = await Ticket.countDocuments();
            console.log(`📊 Total tickets to vectorize: ${this.totalTickets}`);
            
            let consecutiveErrors = 0;
            const maxConsecutiveErrors = 3;
            
            while (this.processedCount < this.totalTickets) {
                try {
                    // Get next batch of tickets
                    const tickets = await this.getTicketsToVectorize();
                    
                    if (tickets.length === 0) {
                        console.log('✅ No more tickets to process');
                        break;
                    }
                    
                    // Vectorize the batch
                    const result = await this.vectorizeBatch(tickets);
                    
                    // Update progress
                    this.processedCount += tickets.length;
                    this.saveProgress();
                    
                    // Calculate progress
                    const progressPercent = ((this.processedCount / this.totalTickets) * 100).toFixed(1);
                    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
                    const rate = this.processedCount / elapsed;
                    const remaining = Math.round((this.totalTickets - this.processedCount) / rate);
                    
                    console.log(`✅ Batch completed: ${result.successful} successful, ${result.failed} failed`);
                    console.log(`📊 Progress: ${this.processedCount}/${this.totalTickets} (${progressPercent}%)`);
                    console.log(`⏱️ Rate: ${rate.toFixed(1)} tickets/sec, ETA: ${remaining}s`);
                    
                    // Reset error counter on success
                    consecutiveErrors = 0;
                    
                    // Add delay between batches to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    consecutiveErrors++;
                    console.error(`❌ Batch failed (attempt ${consecutiveErrors}):`, error.message);
                    
                    if (error.message === 'API_KEY_ERROR') {
                        // Try again with new API key
                        continue;
                    }
                    
                    if (consecutiveErrors >= maxConsecutiveErrors) {
                        console.error('💥 Too many consecutive errors, stopping vectorization');
                        console.log(`📊 Progress saved: ${this.processedCount}/${this.totalTickets} tickets processed`);
                        console.log('🔄 You can resume later with: npm run vectorize:tickets');
                        break;
                    }
                    
                    // Wait before retry
                    console.log(`⏳ Waiting 5 seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            
            if (this.processedCount >= this.totalTickets) {
                console.log('🎉 All tickets vectorized successfully!');
                this.clearProgress();
            }
            
        } catch (error) {
            console.error('💥 Vectorization process failed:', error);
            console.log(`📊 Progress saved: ${this.processedCount}/${this.totalTickets} tickets processed`);
            throw error;
        }
    }

    /**
     * Generate final report
     */
    generateReport() {
        const elapsed = Math.round((Date.now() - this.startTime) / 1000);
        const rate = this.processedCount / elapsed;
        
        console.log('\n📊 VECTORIZATION REPORT');
        console.log('='.repeat(50));
        console.log(`✅ Tickets processed: ${this.processedCount}/${this.totalTickets}`);
        console.log(`⏱️ Total time: ${elapsed}s`);
        console.log(`📈 Average rate: ${rate.toFixed(1)} tickets/sec`);
        console.log(`🔑 Current API key: ${this.currentKeyIndex + 1}/${this.geminiKeys.length}`);
        
        if (this.processedCount < this.totalTickets) {
            console.log(`\n🔄 To resume: npm run vectorize:tickets`);
        } else {
            console.log(`\n🎉 Vectorization completed successfully!`);
        }
    }

    /**
     * Main execution method
     */
    async run() {
        try {
            await this.initialize();
            await this.processAllTickets();
            this.generateReport();
            
        } catch (error) {
            console.error('💥 Fatal error:', error);
            this.generateReport();
            process.exit(1);
        } finally {
            // Close database connections
            try {
                await mongoose.disconnect();
                console.log('🔌 MongoDB connection closed');
            } catch (error) {
                console.error('Error closing MongoDB connection:', error);
            }
        }
    }
}

// Run the vectorizer if this script is executed directly
if (require.main === module) {
    const vectorizer = new TicketVectorizer();
    vectorizer.run().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}

module.exports = TicketVectorizer;
