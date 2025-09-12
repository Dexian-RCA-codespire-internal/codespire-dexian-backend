/**
 * Ticket Routes
 * API endpoints for ticket-related operations including similarity search
 */

const express = require('express');
const ticketController = require('../controllers/ticketController');
const { validateSimilarTicketsRequest } = require('../validators/ticketValidators');

const router = express.Router();

/**
 * POST /api/tickets/similar
 * Find similar tickets based on input ticket data
 */
router.post('/similar', 
    validateSimilarTicketsRequest,
    ticketController.findSimilarTickets
);

/**
 * GET /api/tickets/similarity/health
 * Health check for the ticket similarity service
 */
router.get('/similarity/health', ticketController.checkHealth);

module.exports = router;
