/**
 * Ticket Similarity Routes - Auto-documented
 * AI-powered ticket similarity search and analysis endpoints
 */

const express = require('express');
const ticketController = require('../controllers/ticketSimilarityController');

const { validateSimilarTicketsRequest, validateTicketSuggestionsRequest } = require('../validators/ticketSimilarityValidators');
const { doc } = require('../utils/apiDoc');

const router = express.Router();

router.post('/similar', 
  doc.post('/ticket-similarity/similar', 'Find similar tickets using AI vector search', ['AI Services', 'Ticket Analysis']),
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
  doc.get('/ticket-similarity/similarity/health', 'Check health status of AI similarity search service', ['AI Services', 'Health']),
  ticketController.checkHealth);

module.exports = router;
