/**
 * Ticket Resolution Service
 * Business logic layer for ticket resolution operations
 */

const resolutionAgent = require('./resolution-agent');
const { utils } = require('../shared');
const { createSuccessResponse, createErrorResponse } = utils.responseFormatting;
const config = require('./config');

class TicketResolutionService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            await resolutionAgent.initialize();
            this.initialized = true;
        } catch (error) {
            console.error('❌ Failed to initialize Ticket Resolution Service:', error);
            throw error;
        }
    }

    /**
     * Resolve a ticket with root cause analysis
     */
    async resolveTicket(ticket, rootCause, options = {}) {
        try {
            const startTime = Date.now();
            
            // Validate inputs
            const ticketValidation = resolutionAgent.validateTicketInput(ticket);
            if (!ticketValidation.isValid) {
                return createErrorResponse(
                    'Invalid ticket data',
                    ticketValidation.errors.join(', ')
                );
            }

            // const rootCauseValidation = resolutionAgent.validateRootCause(rootCause);
            // if (!rootCauseValidation.isValid) {
            //     return createErrorResponse(
            //         'Invalid root cause',
            //         rootCauseValidation.errors.join(', ')
            //     );
            // }

            // Analyze ticket resolution
            const analysis = await resolutionAgent.analyzeTicketResolution(ticket, rootCause);
            
            const processingTime = Date.now() - startTime;
            
            // Use analysis results if successful, otherwise use fallback values
            let resolutionData;
            if (analysis.success && analysis.data) {
                resolutionData = {
                    rootCause,
                    closeCode: analysis.data.closeCode || 'Solution provided',
                    customerSummary: analysis.data.customerSummary || 'Issue has been resolved successfully.',
                    problemStatement: analysis.data.problemStatement || this.extractProblemStatement(ticket),
                    analysis: analysis.data.analysis || 'Analysis completed with fallback values due to LLM unavailability.'
                };
            } else {
                // Fallback when LLM analysis fails
                console.log('⚠️ LLM analysis failed, using fallback values:', analysis.error);
                resolutionData = {
                    rootCause,
                    closeCode: 'Solution provided',
                    customerSummary: 'Issue has been resolved successfully.',
                    problemStatement: this.extractProblemStatement(ticket),
                    analysis: 'Analysis completed with fallback values due to LLM unavailability.'
                };
            }
            
            // Create response
            return createSuccessResponse({
                ticket: {
                    _id: ticket._id,
                    ticket_id: ticket.ticket_id,
                    source: ticket.source,
                    short_description: ticket.short_description,
                    category: ticket.category,
                    priority: ticket.priority,
                    impact: ticket.impact,
                    urgency: ticket.urgency,
                    sys_id: ticket.raw?.sys_id
                },
                resolution: resolutionData,
                processing_time_ms: processingTime
            }, 'Ticket resolution analysis completed successfully');
            
        } catch (error) {
            console.error('❌ Error in resolveTicket:', error);
            return createErrorResponse(
                'Failed to resolve ticket',
                error.message
            );
        }
    }

    /**
     * Extract problem statement from ticket data
     */
    extractProblemStatement(ticket) {
        const parts = [];
        
        if (ticket.short_description) {
            parts.push(`Issue: ${ticket.short_description}`);
        }
        
        if (ticket.description) {
            parts.push(`Description: ${ticket.description}`);
        }
        
        if (ticket.category) {
            parts.push(`Category: ${ticket.category}`);
        }
        
        return parts.join('\n');
    }
}

// Export singleton instance
module.exports = new TicketResolutionService();