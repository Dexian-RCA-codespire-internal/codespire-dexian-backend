/**
 * Ticket Similarity Service - Refactored
 * Business logic layer using shared components
 */

const searchAgent = require('./search-agent');
const { utils } = require('../shared');
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;
const config = require('./config');

class TicketSimilarityService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Find similar tickets for the given input ticket
     */
    async findSimilarTickets(inputTicket, options = {}) {
        try {
            const startTime = Date.now();
            
            // Search for similar tickets using refactored search agent
            const results = await searchAgent.searchSimilarTickets(inputTicket, options);
            
            const processingTime = Date.now() - startTime;
            
            // Create response using shared utility
            return createSuccessResponse({
                query: {
                    ticket_id: inputTicket.ticket_id,
                    source: inputTicket.source,
                    short_description: inputTicket.short_description,
                    category: inputTicket.category
                },
                total_results: results.length,
                min_confidence_threshold: config.response.minConfidenceScore,
                results: results,
                processing_time_ms: processingTime
            }, `Found ${results.length} similar tickets above ${Math.round(config.response.minConfidenceScore * 100)}% confidence`);
            
        } catch (error) {
            console.error('❌ Error in findSimilarTickets:', error);
            return createErrorResponse(
                'Failed to find similar tickets',
                error.message
            );
        }
    }

    /**
     * Generate explanation for similarity results
     */
    async generateSimilarityExplanation(inputTicket, results) {
        try {
            const explanation = await searchAgent.generateSimilarityExplanation(
                inputTicket, 
                results.results || results
            );
            
            if (explanation) {
                return createSuccessResponse({ explanation }, 'Explanation generated successfully');
            } else {
                return createSuccessResponse({ explanation: null }, 'No explanation could be generated');
            }
        } catch (error) {
            console.error('❌ Error generating explanation:', error);
            return createErrorResponse('Failed to generate explanation', error.message);
        }
    }

    /**
     * Check health status of the service
     */
    async checkHealth() {
        try {
            return await searchAgent.healthCheck();
        } catch (error) {
            return createErrorResponse('Health check failed', error.message);
        }
    }

    /**
     * Parse query parameters for search options
     */
    parseSearchOptions(query) {
        const options = {
            includeDebugInfo: query.debug === 'true',
            businessRules: {}
        };

        // Parse allowed sources
        if (query.allowed_sources) {
            options.businessRules.allowedSources = query.allowed_sources
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }
        
        // Parse allowed categories
        if (query.allowed_categories) {
            options.businessRules.allowedCategories = query.allowed_categories
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }
        
        // Parse allowed statuses
        if (query.allowed_statuses) {
            options.businessRules.allowedStatuses = query.allowed_statuses
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }

        return options;
    }

    /**
     * Format search response for API
     */
    formatSearchResponse(inputTicket, results, processingTime, explanation = null) {
        const response = {
            success: true,
            message: `Found ${results.total_results || 0} similar tickets above ${Math.round(config.response.minConfidenceScore * 100)}% confidence`,
            query: {
                ticket_id: inputTicket.ticket_id,
                source: inputTicket.source,
                short_description: inputTicket.short_description,
                category: inputTicket.category
            },
            ...results,
            metadata: {
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            }
        };

        if (explanation) {
            response.explanation = explanation;
        }

        return response;
    }

    /**
     * Get service capabilities and configuration
     */
    getCapabilities() {
        return searchAgent.getCapabilities();
    }

    /**
     * Batch process multiple tickets for similarity search
     */
    async findSimilarTicketsBatch(tickets, options = {}) {
        const results = [];
        
        for (const ticket of tickets) {
            try {
                const result = await this.findSimilarTickets(ticket, options);
                results.push({
                    input_ticket: ticket,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    input_ticket: ticket,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return createSuccessResponse({
            batch_results: results,
            total_processed: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        }, `Processed ${results.length} tickets in batch`);
    }


    /**
     * Validate ticket input
     */
    validateTicketInput(ticket) {
        return searchAgent.validateTicketInput(ticket);
    }
}

// Export singleton instance
module.exports = new TicketSimilarityService();
