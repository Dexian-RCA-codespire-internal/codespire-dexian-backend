/**
 * Ticket Routes
 * API endpoints for ticket-related operations including similarity search and CRUD operations
 */

const express = require('express');
const ticketController = require('../controllers/ticketSimilarityController');
const { validateSimilarTicketsRequest, validateTicketSuggestionsRequest } = require('../validators/ticketSimilarityValidators');

const router = express.Router();

router.post('/similar', 
    validateSimilarTicketsRequest,
    ticketController.findSimilarTickets
);

router.post('/suggestions',
    validateTicketSuggestionsRequest,
    ticketController.generateTicketSuggestions
);

// GET /api/tickets/similarity/health - Health check for the ticket similarity service
router.get('/similarity/health', ticketController.checkHealth);

module.exports = router;
