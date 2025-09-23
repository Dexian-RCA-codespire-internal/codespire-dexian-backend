#!/usr/bin/env node

/**
 * Ticket Data Generation Script
 * 
 * Generates 10,000 realistic tickets with proper distribution and stores them in:
 * - MongoDB (tickets collection)
 * - Qdrant Vector Database (for similarity search)
 * 
 * Features:
 * - Realistic ticket categories with proper distribution
 * - Date range: September 15-23, 2025
 * - Splunk server logs (3+ per ticket)
 * - Similar tickets grouped by category (e.g., email: 3-8 tickets)
 * - Progress tracking and reporting
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');

// Load environment variables if available
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models and services
const Ticket = require('../src/models/Tickets');
const { initializeDatabase } = require('../src/config/database');
const ticketVectorizationService = require('../src/services/ticketVectorizationService');

class TicketGenerator {
    constructor() {
        this.totalTickets = 10000;
        this.startDate = new Date('2025-09-15T00:00:00Z');
        this.endDate = new Date('2025-09-23T23:59:59Z');
        this.qdrantClient = null;
        this.generatedCount = 0;
        
        // Ticket categories with realistic distribution
        this.categories = {
            'Email': {
                weight: 0.15,
                minSimilar: 3,
                maxSimilar: 8,
                subcategories: ['Configuration', 'Access', 'Synchronization', 'Attachment'],
                templates: [
                    'Email signature not showing up in replies',
                    'Unable to send emails to external recipients',
                    'Emails going to spam folder automatically',
                    'Email attachments not downloading properly',
                    'Outlook not syncing with server',
                    'Email forwarding rules not working',
                    'Cannot access shared mailbox',
                    'Email delivery delays experienced'
                ]
            },
            'Network': {
                weight: 0.12,
                minSimilar: 4,
                maxSimilar: 7,
                subcategories: ['Connectivity', 'VPN', 'WiFi', 'Performance'],
                templates: [
                    'Unable to connect to company VPN',
                    'Intermittent network connectivity issues',
                    'WiFi connection dropping frequently',
                    'Slow network performance in building',
                    'Cannot access internal network resources',
                    'VPN authentication failing repeatedly',
                    'Network printer not accessible',
                    'Remote desktop connection timing out'
                ]
            },
            'Authentication': {
                weight: 0.10,
                minSimilar: 3,
                maxSimilar: 6,
                subcategories: ['Password', 'MFA', 'Account', 'SSO'],
                templates: [
                    'Password reset not working properly',
                    'Multi-factor authentication not receiving codes',
                    'Account locked after failed login attempts',
                    'Single sign-on redirection failing',
                    'Cannot change expired password',
                    'Two-factor authentication app not syncing',
                    'Login session timing out too quickly',
                    'Password complexity requirements unclear'
                ]
            },
            'Hardware': {
                weight: 0.08,
                minSimilar: 2,
                maxSimilar: 5,
                subcategories: ['Laptop', 'Desktop', 'Peripherals', 'Mobile'],
                templates: [
                    'Laptop keyboard keys not responding',
                    'Monitor display showing distorted colors',
                    'Mouse cursor jumping erratically',
                    'USB ports not recognizing devices',
                    'Laptop battery draining too quickly',
                    'External monitor not being detected',
                    'Webcam not working in video calls',
                    'Headphones producing static noise'
                ]
            },
            'Software': {
                weight: 0.20,
                minSimilar: 4,
                maxSimilar: 9,
                subcategories: ['Application', 'Update', 'Installation', 'License'],
                templates: [
                    'Application crashing during startup',
                    'Software update installation failed',
                    'License activation error message',
                    'Cannot install required business software',
                    'Application running extremely slowly',
                    'File associations not working correctly',
                    'Software compatibility issues with OS',
                    'Plugin not loading in web browser'
                ]
            },
            'Inquiry / Help': {
                weight: 0.25,
                minSimilar: 5,
                maxSimilar: 12,
                subcategories: ['General', 'Training', 'Process', 'Information'],
                templates: [
                    'How to access company intranet portal',
                    'Need training on new software system',
                    'Process for requesting equipment replacement',
                    'Information about IT security policies',
                    'How to setup out-of-office email reply',
                    'Steps to connect personal device to WiFi',
                    'Guidelines for data backup procedures',
                    'Instructions for remote work setup'
                ]
            },
            'Incident': {
                weight: 0.10,
                minSimilar: 2,
                maxSimilar: 4,
                subcategories: ['System', 'Security', 'Data', 'Service'],
                templates: [
                    'System outage affecting multiple users',
                    'Potential security breach detected',
                    'Data corruption in shared drive',
                    'Service unavailable error messages',
                    'Database connection failures',
                    'Email server experiencing downtime',
                    'Website loading extremely slowly',
                    'Critical application not responding'
                ]
            }
        };

        // Status distribution (realistic for closed tickets)
        this.statusDistribution = {
            'Closed': 0.85,
            'Resolved': 0.10,
            'Cancelled': 0.05
        };

        // Priority distribution
        this.priorityDistribution = {
            '1 - Critical': 0.05,
            '2 - High': 0.15,
            '3 - Moderate': 0.40,
            '4 - Low': 0.30,
            '5 - Planning': 0.10
        };

        // Impact/Urgency distribution
        this.impactUrgencyDistribution = {
            '1 - High': 0.10,
            '2 - Medium': 0.35,
            '3 - Low': 0.55
        };

        // Sample users and companies
        this.users = [
            'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson',
            'Lisa Anderson', 'Robert Taylor', 'Jennifer Martinez', 'William Garcia', 'Maria Rodriguez',
            'James Miller', 'Patricia Jones', 'Christopher Lee', 'Linda White', 'Matthew Harris',
            'Barbara Clark', 'Anthony Lewis', 'Susan Walker', 'Mark Hall', 'Nancy Young',
            'Steven King', 'Betty Wright', 'Paul Lopez', 'Helen Hill', 'Andrew Green',
            'Donna Adams', 'Joshua Baker', 'Carol Nelson', 'Ryan Carter', 'Michelle Mitchell',
            'Kevin Perez', 'Sandra Roberts', 'Brian Turner', 'Kimberly Phillips', 'Edward Campbell',
            'Dorothy Parker', 'Ronald Evans', 'Lisa Edwards', 'Jason Collins', 'Karen Stewart',
            'Daniel Sanchez', 'Helen Morris', 'Kenneth Rogers', 'Sharon Reed', 'Thomas Cook',
            'Deborah Bailey', 'Joseph Cooper', 'Jessica Richardson', 'Charles Cox', 'Amy Ward'
        ];

        this.companies = [
            'ACME Corporation', 'TechFlow Solutions', 'Global Industries Inc', 'DataSync Systems',
            'CloudFirst Technologies', 'SecureNet Solutions', 'InnovateTech Corp', 'DigitalBridge LLC',
            'NextGen Enterprises', 'SmartSystems Group', 'ConnectHub Solutions', 'TechAdvantage Inc'
        ];

        this.locations = [
            'New York Office', 'San Francisco Office', 'Chicago Office', 'Los Angeles Office',
            'Seattle Office', 'Austin Office', 'Boston Office', 'Denver Office',
            'Atlanta Office', 'Miami Office', 'Dallas Office', 'Phoenix Office'
        ];

        // Splunk log templates
        this.logTemplates = [
            {
                service: 'auth-service',
                levels: ['ERROR', 'WARN', 'INFO'],
                messages: [
                    'Authentication failed for user {user}',
                    'Password reset requested for {user}',
                    'Multi-factor authentication timeout',
                    'Session expired for user {user}',
                    'Login attempt from suspicious IP',
                    'Account locked due to multiple failed attempts'
                ]
            },
            {
                service: 'email-service',
                levels: ['ERROR', 'WARN', 'INFO'],
                messages: [
                    'SMTP connection timeout',
                    'Email delivery failed to {recipient}',
                    'Attachment size exceeds limit',
                    'Spam filter blocked email',
                    'Email queue processing delayed',
                    'Mailbox quota exceeded for {user}'
                ]
            },
            {
                service: 'network-service',
                levels: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
                messages: [
                    'VPN connection established for {user}',
                    'Network latency threshold exceeded',
                    'DNS resolution failed for {domain}',
                    'Firewall blocked connection attempt',
                    'Bandwidth utilization at 95%',
                    'Network interface down on {server}'
                ]
            },
            {
                service: 'app-service',
                levels: ['ERROR', 'WARN', 'INFO'],
                messages: [
                    'Application startup failed',
                    'Database connection pool exhausted',
                    'Memory usage threshold exceeded',
                    'API rate limit reached for {user}',
                    'File processing completed successfully',
                    'Cache invalidation triggered'
                ]
            },
            {
                service: 'system-service',
                levels: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
                messages: [
                    'Disk space low on {server}',
                    'CPU utilization at 90%',
                    'Service restart initiated',
                    'Backup process completed',
                    'System health check passed',
                    'Log rotation completed'
                ]
            }
        ];
    }

    /**
     * Initialize database connections
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Ticket Generator...');
            
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
     * Clear existing data from MongoDB and Qdrant
     */
    async clearExistingData() {
        try {
            console.log('🧹 Clearing existing data...');
            
            // Clear MongoDB tickets collection
            const mongoResult = await Ticket.deleteMany({});
            console.log(`✅ Cleared ${mongoResult.deletedCount} tickets from MongoDB`);
            
            // Get Qdrant client from vectorization service
            const qdrantClient = ticketVectorizationService.qdrantClient;
            
            // Clear Qdrant collection
            try {
                await qdrantClient.deleteCollection('ticket');
                console.log('✅ Cleared Qdrant ticket collection');
            } catch (error) {
                if (error.message.includes('Not found')) {
                    console.log('ℹ️ Qdrant ticket collection does not exist');
                } else {
                    throw error;
                }
            }
            
            // Recreate Qdrant collection
            await qdrantClient.createCollection('ticket', {
                vectors: {
                    size: 768,
                    distance: 'Cosine',
                },
            });
            console.log('✅ Recreated Qdrant ticket collection');
            
        } catch (error) {
            console.error('❌ Error clearing existing data:', error);
            throw error;
        }
    }

    /**
     * Generate random date within the specified range
     */
    generateRandomDate() {
        const start = this.startDate.getTime();
        const end = this.endDate.getTime();
        const randomTime = start + Math.random() * (end - start);
        return new Date(randomTime);
    }

    /**
     * Get weighted random selection
     */
    getWeightedRandom(distribution) {
        const random = Math.random();
        let cumulative = 0;
        
        for (const [key, weight] of Object.entries(distribution)) {
            cumulative += weight;
            if (random <= cumulative) {
                return key;
            }
        }
        
        // Fallback to first key
        return Object.keys(distribution)[0];
    }

    /**
     * Generate realistic Splunk logs
     */
    generateSplunkLogs(ticketCategory, count = null) {
        const logCount = count || (3 + Math.floor(Math.random() * 5)); // 3-7 logs
        const logs = [];
        
        for (let i = 0; i < logCount; i++) {
            const template = this.logTemplates[Math.floor(Math.random() * this.logTemplates.length)];
            const level = template.levels[Math.floor(Math.random() * template.levels.length)];
            const messageTemplate = template.messages[Math.floor(Math.random() * template.messages.length)];
            
            // Replace placeholders in message
            let message = messageTemplate;
            if (message.includes('{user}')) {
                message = message.replace('{user}', this.users[Math.floor(Math.random() * this.users.length)]);
            }
            if (message.includes('{recipient}')) {
                message = message.replace('{recipient}', `${this.users[Math.floor(Math.random() * this.users.length)].toLowerCase().replace(' ', '.')}@company.com`);
            }
            if (message.includes('{domain}')) {
                message = message.replace('{domain}', 'internal.company.com');
            }
            if (message.includes('{server}')) {
                message = message.replace('{server}', `srv-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`);
            }
            
            // Generate timestamp within reasonable range of ticket time
            const baseTime = this.generateRandomDate();
            const logTime = new Date(baseTime.getTime() + (Math.random() - 0.5) * 3600000); // ±30 minutes
            
            logs.push({
                time: logTime.toISOString(),
                service: template.service,
                level: level,
                message: message
            });
        }
        
        return logs.sort((a, b) => new Date(a.time) - new Date(b.time));
    }

    /**
     * Generate a single realistic ticket
     */
    generateTicket(category, template, variation = 0) {
        const categoryData = this.categories[category];
        const openedTime = this.generateRandomDate();
        
        // Generate close time (1 minute to 24 hours after opened)
        const closeDelay = Math.random() * 24 * 60 * 60 * 1000; // 0-24 hours in ms
        const closedTime = new Date(openedTime.getTime() + Math.max(60000, closeDelay)); // minimum 1 minute
        const resolvedTime = closedTime;
        
        // Generate ticket ID
        const ticketId = `INC${String(1000000 + Math.floor(Math.random() * 9000000)).padStart(7, '0')}`;
        
        // Add variation to template
        let shortDescription = template;
        let description = `${template}.\r\n\r\n`;
        
        if (variation > 0) {
            const variations = [
                'issue', 'problem', 'error', 'failure', 'not working', 'malfunction',
                'difficulty', 'trouble', 'unable to', 'cannot', 'won\'t', 'doesn\'t'
            ];
            const randomVariation = variations[Math.floor(Math.random() * variations.length)];
            shortDescription = template.replace(/not working|issue|problem|error/, randomVariation);
            
            // Add more context to description
            const contexts = [
                'This started happening after the recent update.',
                'The issue occurs intermittently throughout the day.',
                'Multiple users have reported similar problems.',
                'This is affecting productivity significantly.',
                'The problem persists after restarting the application.',
                'Other team members are experiencing the same issue.',
                'This worked fine until yesterday morning.',
                'The error message appears randomly.'
            ];
            description += `${contexts[Math.floor(Math.random() * contexts.length)]}\r\n\r\n`;
        }
        
        // Select random user, company, location
        const caller = this.users[Math.floor(Math.random() * this.users.length)];
        const company = this.companies[Math.floor(Math.random() * this.companies.length)];
        const location = this.locations[Math.floor(Math.random() * this.locations.length)];
        
        // Generate ticket data
        const ticket = {
            ticket_id: ticketId,
            source: 'ServiceNow',
            short_description: shortDescription,
            description: description,
            category: category,
            subcategory: categoryData.subcategories[Math.floor(Math.random() * categoryData.subcategories.length)],
            status: this.getWeightedRandom(this.statusDistribution),
            priority: this.getWeightedRandom(this.priorityDistribution),
            impact: this.getWeightedRandom(this.impactUrgencyDistribution),
            urgency: this.getWeightedRandom(this.impactUrgencyDistribution),
            opened_time: openedTime,
            closed_time: closedTime,
            resolved_time: resolvedTime,
            assigned_to: { id: '' },
            assignment_group: { id: '' },
            location: { id: '' },
            tags: [],
            raw: {
                short_description: shortDescription,
                closed_at: closedTime.toISOString().replace('T', ' ').replace('Z', ''),
                assignment_group: '',
                impact: this.getWeightedRandom(this.impactUrgencyDistribution),
                description: description,
                priority: this.getWeightedRandom(this.priorityDistribution),
                sys_id: crypto.randomUUID().replace(/-/g, ''),
                number: ticketId,
                opened_at: openedTime.toISOString().replace('T', ' ').replace('Z', ''),
                urgency: this.getWeightedRandom(this.impactUrgencyDistribution),
                resolved_at: resolvedTime.toISOString().replace('T', ' ').replace('Z', ''),
                caller_id: {
                    display_value: caller,
                    link: `https://dev283514.service-now.com/api/now/table/sys_user/${crypto.randomUUID().replace(/-/g, '')}`
                },
                company: {
                    display_value: company,
                    link: `https://dev283514.service-now.com/api/now/table/core_company/${crypto.randomUUID().replace(/-/g, '')}`
                },
                location: location,
                state: this.getWeightedRandom(this.statusDistribution),
                category: category,
                subcategory: categoryData.subcategories[Math.floor(Math.random() * categoryData.subcategories.length)],
                assigned_to: ''
            },
            logs: this.generateSplunkLogs(category)
        };
        
        return ticket;
    }

    /**
     * Generate tickets with proper distribution and similarity grouping
     */
    async generateTickets() {
        try {
            console.log(`📊 Generating ${this.totalTickets} tickets...`);
            
            const tickets = [];
            let ticketId = 0;
            
            // Generate tickets for each category with proper distribution
            for (const [category, categoryData] of Object.entries(this.categories)) {
                const categoryCount = Math.floor(this.totalTickets * categoryData.weight);
                console.log(`📝 Generating ${categoryCount} tickets for category: ${category}`);
                
                let categoryTickets = 0;
                
                // Generate similar ticket groups
                while (categoryTickets < categoryCount) {
                    const template = categoryData.templates[Math.floor(Math.random() * categoryData.templates.length)];
                    const similarCount = Math.min(
                        categoryData.minSimilar + Math.floor(Math.random() * (categoryData.maxSimilar - categoryData.minSimilar + 1)),
                        categoryCount - categoryTickets
                    );
                    
                    // Generate similar tickets
                    for (let i = 0; i < similarCount; i++) {
                        const ticket = this.generateTicket(category, template, i);
                        tickets.push(ticket);
                        categoryTickets++;
                        
                        // Progress reporting
                        if (tickets.length % 500 === 0) {
                            console.log(`📈 Generated ${tickets.length}/${this.totalTickets} tickets`);
                        }
                    }
                }
            }
            
            // Fill remaining tickets if needed
            while (tickets.length < this.totalTickets) {
                const categories = Object.keys(this.categories);
                const randomCategory = categories[Math.floor(Math.random() * categories.length)];
                const categoryData = this.categories[randomCategory];
                const template = categoryData.templates[Math.floor(Math.random() * categoryData.templates.length)];
                
                const ticket = this.generateTicket(randomCategory, template);
                tickets.push(ticket);
            }
            
            // Ensure exactly the required number of tickets
            const finalTickets = tickets.slice(0, this.totalTickets);
            console.log(`✅ Generated ${finalTickets.length} tickets (target: ${this.totalTickets})`);
            return finalTickets;
            
        } catch (error) {
            console.error('❌ Error generating tickets:', error);
            throw error;
        }
    }

    /**
     * Save tickets to MongoDB and Qdrant
     */
    async saveTickets(tickets) {
        try {
            console.log(`💾 Saving ${tickets.length} tickets to MongoDB...`);
            
            // Save to MongoDB in batches
            const batchSize = 100;
            const savedTickets = [];
            let totalSaved = 0;
            
            for (let i = 0; i < tickets.length; i += batchSize) {
                const batch = tickets.slice(i, i + batchSize);
                try {
                    const savedBatch = await Ticket.insertMany(batch, { ordered: false });
                    savedTickets.push(...savedBatch);
                    totalSaved += savedBatch.length;
                    
                    console.log(`💾 Saved ${totalSaved}/${tickets.length} tickets to MongoDB`);
                } catch (error) {
                    console.error(`❌ Error saving batch ${i}-${i + batchSize}:`, error.message);
                    // Continue with next batch
                }
            }
            
            console.log(`✅ MongoDB save completed: ${totalSaved} tickets saved`);
            
            // Save to Qdrant vector database
            console.log('🔄 Vectorizing and storing tickets in Qdrant...');
            
            const mongoIds = savedTickets.map(ticket => ticket._id);
            const vectorizationResult = await ticketVectorizationService.vectorizeAndStoreTicketsBatch(
                savedTickets,
                mongoIds
            );
            
            console.log(`✅ Vectorization completed: ${vectorizationResult.successful} successful, ${vectorizationResult.failed} failed`);
            
            if (vectorizationResult.errors.length > 0) {
                console.log('⚠️ Vectorization errors:');
                vectorizationResult.errors.slice(0, 5).forEach(error => {
                    console.log(`   - ${error.ticket_id}: ${error.error}`);
                });
                if (vectorizationResult.errors.length > 5) {
                    console.log(`   ... and ${vectorizationResult.errors.length - 5} more errors`);
                }
            }
            
            return savedTickets;
            
        } catch (error) {
            console.error('❌ Error saving tickets:', error);
            throw error;
        }
    }

    /**
     * Generate progress report
     */
    generateReport(tickets) {
        console.log('\n📊 GENERATION REPORT');
        console.log('='.repeat(50));
        
        // Category distribution
        const categoryStats = {};
        tickets.forEach(ticket => {
            const category = ticket.category;
            categoryStats[category] = (categoryStats[category] || 0) + 1;
        });
        
        console.log('\n📈 Category Distribution:');
        Object.entries(categoryStats).forEach(([category, count]) => {
            const percentage = ((count / tickets.length) * 100).toFixed(1);
            console.log(`   ${category}: ${count} tickets (${percentage}%)`);
        });
        
        // Status distribution
        const statusStats = {};
        tickets.forEach(ticket => {
            const status = ticket.status;
            statusStats[status] = (statusStats[status] || 0) + 1;
        });
        
        console.log('\n📊 Status Distribution:');
        Object.entries(statusStats).forEach(([status, count]) => {
            const percentage = ((count / tickets.length) * 100).toFixed(1);
            console.log(`   ${status}: ${count} tickets (${percentage}%)`);
        });
        
        // Date range
        const dates = tickets.map(t => new Date(t.opened_time)).sort();
        console.log(`\n📅 Date Range: ${dates[0].toISOString().split('T')[0]} to ${dates[dates.length-1].toISOString().split('T')[0]}`);
        
        // Log statistics
        const totalLogs = tickets.reduce((sum, ticket) => sum + (ticket.logs?.length || 0), 0);
        console.log(`\n📋 Logs Generated: ${totalLogs} total logs (avg ${(totalLogs/tickets.length).toFixed(1)} per ticket)`);
        
        console.log('\n✅ Generation completed successfully!');
    }

    /**
     * Main execution method
     */
    async run() {
        try {
            await this.initialize();
            await this.clearExistingData();
            
            const tickets = await this.generateTickets();
            const savedTickets = await this.saveTickets(tickets);
            
            this.generateReport(savedTickets);
            
        } catch (error) {
            console.error('💥 Fatal error:', error);
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

// Run the generator if this script is executed directly
if (require.main === module) {
    const generator = new TicketGenerator();
    generator.run().then(() => {
        console.log('🎉 Ticket generation completed!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}

module.exports = TicketGenerator;
