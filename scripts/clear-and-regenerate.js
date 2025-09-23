#!/usr/bin/env node

/**
 * Clear existing data and regenerate tickets with proper schema
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initializeDatabase } = require('../src/config/database');
const Ticket = require('../src/models/Tickets');

async function clearAndRegenerate() {
    try {
        console.log('🧹 Clearing existing data and regenerating...');
        
        // Initialize database
        await initializeDatabase();
        console.log('✅ Database initialized');
        
        // Clear existing tickets
        const deleteResult = await Ticket.deleteMany({});
        console.log(`🗑️ Cleared ${deleteResult.deletedCount} existing tickets`);
        
        // Close connection
        await mongoose.disconnect();
        console.log('🔌 MongoDB connection closed');
        
        console.log('\n✅ Data cleared successfully!');
        console.log('🚀 Now run: npm run generate:tickets');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

clearAndRegenerate();
