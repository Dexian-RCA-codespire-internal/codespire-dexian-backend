#!/usr/bin/env node

/**
 * Test script for ticket generation
 * Generates a small sample (100 tickets) to validate the system works
 */

const TicketGenerator = require('./generate-tickets');
const { initializeDatabase } = require('../src/config/database');

class TestTicketGenerator extends TicketGenerator {
    constructor() {
        super();
        this.totalTickets = 100; // Generate only 100 tickets for testing
    }

    async run() {
        try {
            console.log('🧪 Running ticket generation test (100 tickets)...');
            
            // Initialize databases using the main configuration
            await initializeDatabase();
            console.log('✅ Database initialization completed');
            
            // Don't clear existing data in test mode
            console.log('ℹ️ Skipping data cleanup in test mode');
            
            const tickets = await this.generateTickets();
            console.log(`✅ Generated ${tickets.length} test tickets`);
            
            // Validate ticket structure
            this.validateTicketStructure(tickets[0]);
            
            // Show sample ticket
            console.log('\n📋 Sample Ticket:');
            console.log(JSON.stringify(tickets[0], null, 2));
            
            // Generate statistics without saving
            this.generateReport(tickets);
            
            console.log('\n✅ Test completed successfully!');
            console.log('🚀 Run "npm run generate:tickets" to generate the full 10,000 tickets');
            
        } catch (error) {
            console.error('💥 Test failed:', error);
            process.exit(1);
        } finally {
            // Close database connections
            const mongoose = require('mongoose');
            try {
                await mongoose.disconnect();
                console.log('🔌 MongoDB connection closed');
            } catch (error) {
                console.error('Error closing MongoDB connection:', error);
            }
        }
    }

    validateTicketStructure(ticket) {
        const requiredFields = [
            'ticket_id', 'source', 'short_description', 'description',
            'category', 'status', 'priority', 'impact', 'urgency',
            'opened_time', 'closed_time', 'resolved_time', 'logs', 'raw'
        ];

        console.log('\n🔍 Validating ticket structure...');
        
        for (const field of requiredFields) {
            if (!(field in ticket)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate logs structure
        if (!Array.isArray(ticket.logs) || ticket.logs.length < 3) {
            throw new Error('Logs should be an array with at least 3 entries');
        }

        const log = ticket.logs[0];
        const requiredLogFields = ['time', 'service', 'level', 'message'];
        for (const field of requiredLogFields) {
            if (!(field in log)) {
                throw new Error(`Missing required log field: ${field}`);
            }
        }

        // Validate date range
        const openedDate = new Date(ticket.opened_time);
        const startDate = new Date('2025-09-15');
        const endDate = new Date('2025-09-24');
        
        if (openedDate < startDate || openedDate > endDate) {
            throw new Error(`Ticket date ${openedDate.toISOString()} is outside required range`);
        }

        console.log('✅ Ticket structure validation passed');
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    const testGenerator = new TestTicketGenerator();
    testGenerator.run().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('💥 Test script failed:', error);
        process.exit(1);
    });
}

module.exports = TestTicketGenerator;
