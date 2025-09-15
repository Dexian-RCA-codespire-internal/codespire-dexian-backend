/**
 * Ticket Suggestion Service
 * Business logic layer for ticket resolution suggestions
 */

const searchAgent = require('./search-agent');
const { utils } = require('../shared');
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;
const config = require('./config');

class TicketSuggestionService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Generate ticket resolution suggestions based on similar tickets
     */
    async generateTicketSuggestions(similarTickets, currentTicket = null, options = {}) {
        try {
            const startTime = Date.now();
            
            // Validate input
            const validation = searchAgent.validateInputTickets(similarTickets);
            if (!validation.isValid) {
                return createErrorResponse(
                    'Validation failed',
                    validation.errors.join(', ')
                );
            }
            
            // Check if skeleton loader is requested
            if (options.skeleton === true) {
                return this.generateSkeletonResponse(similarTickets, currentTicket);
            }
            
            // Generate suggestions using the search agent
            const suggestions = await searchAgent.generateTicketSuggestions(similarTickets, currentTicket);
            
            const processingTime = Date.now() - startTime;
            
            // Create response using shared utility
            return createSuccessResponse({
                input_tickets_count: similarTickets.length,
                current_ticket: currentTicket ? {
                    ticket_id: currentTicket.ticket_id,
                    short_description: currentTicket.short_description,
                    category: currentTicket.category
                } : null,
                suggestions: suggestions,
                processing_time_ms: processingTime,
                metadata: {
                    max_suggestions: config.suggestions.maxSuggestions,
                    llm_provider: 'gemini',
                    temperature: 0.1
                }
            }, `Generated ${suggestions.length} resolution suggestions`);
            
        } catch (error) {
            console.error('❌ Error in generateTicketSuggestions:', error);
            return createErrorResponse(
                'Failed to generate ticket suggestions',
                error.message
            );
        }
    }

    /**
     * Generate skeleton response for loading states
     */
    generateSkeletonResponse(similarTickets, currentTicket = null) {
        const skeletonSuggestions = [
            {
                id: 1,
                suggestion: "Loading suggestion 1...",
                confidence: "loading",
                isSkeleton: true
            },
            {
                id: 2,
                suggestion: "Loading suggestion 2...",
                confidence: "loading",
                isSkeleton: true
            },
            {
                id: 3,
                suggestion: "Loading suggestion 3...",
                confidence: "loading",
                isSkeleton: true
            }
        ];

        return createSuccessResponse({
            input_tickets_count: similarTickets.length,
            current_ticket: currentTicket ? {
                ticket_id: currentTicket.ticket_id,
                short_description: currentTicket.short_description,
                category: currentTicket.category
            } : null,
            suggestions: skeletonSuggestions,
            processing_time_ms: 0,
            isSkeleton: true,
            metadata: {
                max_suggestions: config.suggestions.maxSuggestions,
                llm_provider: 'gemini',
                temperature: 0.1,
                skeleton_mode: true
            }
        }, 'Skeleton response generated for loading state');
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
     * Get service capabilities and configuration
     */
    getCapabilities() {
        return searchAgent.getCapabilities();
    }

    /**
     * Batch process multiple sets of similar tickets for suggestions
     */
    async generateSuggestionsBatch(ticketSets) {
        const results = [];
        
        for (const ticketSet of ticketSets) {
            try {
                const result = await this.generateTicketSuggestions(
                    ticketSet.similarTickets, 
                    ticketSet.currentTicket
                );
                results.push({
                    input_set: {
                        similar_tickets_count: ticketSet.similarTickets.length,
                        has_current_ticket: !!ticketSet.currentTicket
                    },
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    input_set: {
                        similar_tickets_count: ticketSet.similarTickets.length,
                        has_current_ticket: !!ticketSet.currentTicket
                    },
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
        }, `Processed ${results.length} ticket sets in batch`);
    }

    /**
     * Generate suggestions with custom parameters
     */
    async generateCustomSuggestions(similarTickets, currentTicket = null, options = {}) {
        try {
            const startTime = Date.now();
            
            // Validate input
            const validation = searchAgent.validateInputTickets(similarTickets);
            if (!validation.isValid) {
                return createErrorResponse(
                    'Validation failed',
                    validation.errors.join(', ')
                );
            }
            
            // Apply custom options if provided
            const customConfig = {
                ...config,
                suggestions: {
                    ...config.suggestions,
                    ...options
                }
            };
            
            // Generate suggestions using the search agent
            const suggestions = await searchAgent.generateTicketSuggestions(similarTickets, currentTicket);
            
            const processingTime = Date.now() - startTime;
            
            // Create response with custom metadata
            return createSuccessResponse({
                input_tickets_count: similarTickets.length,
                current_ticket: currentTicket ? {
                    ticket_id: currentTicket.ticket_id,
                    short_description: currentTicket.short_description,
                    category: currentTicket.category
                } : null,
                suggestions: suggestions,
                processing_time_ms: processingTime,
                metadata: {
                    max_suggestions: customConfig.suggestions.maxSuggestions,
                    llm_provider: 'gemini',
                    temperature: 0.1,
                    custom_options: options
                }
            }, `Generated ${suggestions.length} resolution suggestions with custom options`);
            
        } catch (error) {
            console.error('❌ Error in generateCustomSuggestions:', error);
            return createErrorResponse(
                'Failed to generate custom ticket suggestions',
                error.message
            );
        }
    }

    /**
     * Validate ticket input
     */
    validateTicketInput(tickets) {
        return searchAgent.validateInputTickets(tickets);
    }
}

// Export singleton instance
module.exports = new TicketSuggestionService();
