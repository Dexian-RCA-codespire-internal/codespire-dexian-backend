/**
 * Ticket Similarity Routes - Auto-documented
 * AI-powered ticket similarity search and analysis endpoints
 */

const express = require('express');
const ticketController = require('../controllers/ticketSimilarityController');

const { validateSimilarTicketsRequest, validateTicketSuggestionsRequest } = require('../validators/ticketSimilarityValidators');
// API documentation removed

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
router.get('/similarity/health', 
  ticketController.checkHealth);

module.exports = router;
