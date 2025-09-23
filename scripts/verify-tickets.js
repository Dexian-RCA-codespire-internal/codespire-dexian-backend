#!/usr/bin/env node

/**
 * Verify ticket data structure and logs
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initializeDatabase } = require('../src/config/database');
const Ticket = require('../src/models/Tickets');

async function verifyTickets() {
    try {
        console.log('🔍 Verifying ticket data...');
        
        // Initialize database
        await initializeDatabase();
        console.log('✅ Database initialized');
        
        // Get total count
        const totalCount = await Ticket.countDocuments();
        console.log(`📊 Total tickets: ${totalCount}`);
        
        // Check tickets with logs
        const ticketsWithLogs = await Ticket.countDocuments({ logs: { $exists: true, $ne: [] } });
        console.log(`📋 Tickets with logs: ${ticketsWithLogs}`);
        
        // Get sample ticket with logs
        const sampleTicket = await Ticket.findOne({ logs: { $exists: true, $ne: [] } });
        if (sampleTicket) {
            console.log('\n📄 Sample ticket with logs:');
            console.log(`   Ticket ID: ${sampleTicket.ticket_id}`);
            console.log(`   Category: ${sampleTicket.category}`);
            console.log(`   Logs count: ${sampleTicket.logs.length}`);
            console.log(`   First log:`, JSON.stringify(sampleTicket.logs[0], null, 2));
        }
        
        // Check category distribution
        const categoryStats = await Ticket.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('\n📈 Category Distribution:');
        categoryStats.forEach(stat => {
            const percentage = ((stat.count / totalCount) * 100).toFixed(1);
            console.log(`   ${stat._id}: ${stat.count} (${percentage}%)`);
        });
        
        // Check date range
        const dateRange = await Ticket.aggregate([
            { $group: { 
                _id: null, 
                minDate: { $min: '$opened_time' },
                maxDate: { $max: '$opened_time' }
            }}
        ]);
        
        if (dateRange.length > 0) {
            console.log(`\n📅 Date Range: ${dateRange[0].minDate.toISOString().split('T')[0]} to ${dateRange[0].maxDate.toISOString().split('T')[0]}`);
        }
        
        // Close connection
        await mongoose.disconnect();
        console.log('\n✅ Verification completed!');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verifyTickets();
