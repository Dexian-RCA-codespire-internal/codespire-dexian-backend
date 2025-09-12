/**
 * Ticket Controller
 * HTTP request handlers for ticket-related operations
 */

const { validationResult } = require('express-validator');
const ticketService = require('../services/ticketService');

/**
 * Find similar tickets based on input ticket data
 * POST /api/tickets/similar
 */
const findSimilarTickets = async (req, res) => {
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

        // Extract ticket data from request body
        const inputTicket = {
            ticket_id: req.body.ticket_id,
            source: req.body.source,
            short_description: req.body.short_description,
            description: req.body.description,
            category: req.body.category
        };

        // Parse search options from query parameters
        const options = ticketService.parseSearchOptions(req.query);

        // Find similar tickets
        const startTime = Date.now();
        const results = await ticketService.findSimilarTickets(inputTicket, options);
        const processingTime = Date.now() - startTime;

        // Generate explanation if requested
        let explanation = null;
        if (req.query.explain === 'true' && results.total_results > 0) {
            explanation = await ticketService.generateSimilarityExplanation(inputTicket, results);
        }

        // Format and send response
        const response = ticketService.formatSearchResponse(
            inputTicket, 
            results, 
            processingTime, 
            explanation
        );

        res.json(response);

    } catch (error) {
        console.error('Error in similar tickets endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while finding similar tickets',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

/**
 * Health check for the ticket similarity service
 * GET /api/tickets/similarity/health
 */
const checkHealth = async (req, res) => {
    try {
        const health = await ticketService.checkHealth();
        
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: health.status === 'healthy',
            ...health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in health check:', error);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    findSimilarTickets,
    checkHealth
};
