/**
 * Ticket Resolution Controller
 * HTTP request handlers for ticket resolution operations
 */

const { validationResult } = require('express-validator');
const resolutionService = require('../agents/ticket-resolution/service');
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

        // Resolve ticket using the resolution service
        const resolutionResult = await resolutionService.resolveTicket(ticket, rootCause);

        if (!resolutionResult.success) {
            return res.status(400).json(resolutionResult);
        }

        // Save resolution to database and update ServiceNow
        const saveResult = await serviceNowResolutionService.saveAndUpdateResolution(
            ticket,
            {
                ...resolutionResult.resolution,
                processing_time_ms: resolutionResult.processing_time_ms
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

module.exports = {
    resolveTicket
};
