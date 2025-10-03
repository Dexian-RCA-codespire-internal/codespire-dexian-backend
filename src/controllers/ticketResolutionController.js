/**
 * Ticket Resolution Controller
 * HTTP request handlers for ticket resolution operations
 */

const { validationResult } = require('express-validator');
const { serviceNowResolutionService } = require('../services/servicenowResolutionService');
const RCAResolved = require('../models/RCAResolved');

/**
 * Resolve a ticket with root cause analysis
 * POST /api/tickets/resolve
 */
const resolveTicket = async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { ticket, rootCause } = req.body;

        // Create resolution data without using agent
        const resolutionData = {
            rootCause,
            closeCode: 'Solution provided', // Default resolution code
            customerSummary: rootCause, // Use rootCause as close_notes
            problemStatement: extractProblemStatement(ticket),
            analysis: 'Resolution completed without agent analysis'
        };

        // Save resolution to database and update ServiceNow
        const saveResult = await serviceNowResolutionService.saveAndUpdateResolution(
            ticket,
            {
                ...resolutionData,
                processing_time_ms: 0
            }
        );

        if (!saveResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save resolution',
                error: saveResult.error
            });
        }

        // Return simplified result
        res.json({
            success: true,
            message: 'Ticket resolved successfully'
        });

    } catch (error) {
        console.error('Error in resolve ticket endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while resolving ticket',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Extract problem statement from ticket data
 */
function extractProblemStatement(ticket) {
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

module.exports = {
    resolveTicket
};
