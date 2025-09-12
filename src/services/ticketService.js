/**
 * Ticket Service
 * Business logic for ticket-related operations
 */

const { TicketSimilarityAgent } = require('../agents/ticket-similarity');

class TicketService {
    constructor() {
        this.ticketAgent = null;
    }

    /**
     * Get or initialize the ticket similarity agent
     */
    async getTicketAgent() {
        if (!this.ticketAgent) {
            this.ticketAgent = new TicketSimilarityAgent();
            await this.ticketAgent.initialize();
        }
        return this.ticketAgent;
    }

    /**
     * Find similar tickets based on input ticket data
     * @param {Object} inputTicket - The input ticket data
     * @param {Object} options - Search options and filters
     * @returns {Object} Search results with similar tickets
     */
    async findSimilarTickets(inputTicket, options = {}) {
        const agent = await this.getTicketAgent();
        
        // Set default options
        const searchOptions = {
            includeDebugInfo: options.includeDebugInfo || false,
            businessRules: options.businessRules || {}
        };

        // Find similar tickets
        const results = await agent.findSimilarTickets(inputTicket, searchOptions);
        
        return results;
    }

    /**
     * Generate explanation for similarity results
     * @param {Object} inputTicket - The input ticket data
     * @param {Object} results - The similarity search results
     * @returns {Object} Explanation of similarity matches
     */
    async generateSimilarityExplanation(inputTicket, results) {
        const agent = await this.getTicketAgent();
        return await agent.generateSimilarityExplanation(inputTicket, results);
    }

    /**
     * Check health status of the ticket similarity service
     * @returns {Object} Health status information
     */
    async checkHealth() {
        try {
            const agent = await this.getTicketAgent();
            return await agent.healthCheck();
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                components: {
                    agent: 'failed'
                }
            };
        }
    }

    /**
     * Parse query parameters for filtering options
     * @param {Object} query - Express request query object
     * @returns {Object} Parsed options for ticket search
     */
    parseSearchOptions(query) {
        const options = {
            includeDebugInfo: query.debug === 'true',
            businessRules: {}
        };

        // Apply optional filters from query parameters
        if (query.allowed_sources) {
            options.businessRules.allowedSources = query.allowed_sources.split(',');
        }
        
        if (query.allowed_categories) {
            options.businessRules.allowedCategories = query.allowed_categories.split(',');
        }
        
        if (query.allowed_statuses) {
            options.businessRules.allowedStatuses = query.allowed_statuses.split(',');
        }

        return options;
    }

    /**
     * Format ticket search response
     * @param {Object} inputTicket - The original input ticket
     * @param {Object} results - Search results from agent
     * @param {number} processingTime - Time taken to process request
     * @param {Object} explanation - Optional explanation object
     * @returns {Object} Formatted response object
     */
    formatSearchResponse(inputTicket, results, processingTime, explanation = null) {
        const confidenceThreshold = Math.round(results.min_confidence_threshold * 100);
        
        const response = {
            success: true,
            message: `Found ${results.total_results} similar tickets above ${confidenceThreshold}% confidence`,
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
}

// Export singleton instance
module.exports = new TicketService();
