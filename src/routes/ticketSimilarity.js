/**
 * Ticket Similarity Routes - Auto-documented
 * AI-powered ticket similarity search and analysis endpoints
 */

const express = require('express');
const ticketController = require('../controllers/ticketSimilarityController');
const { validateSimilarTicketsRequest } = require('../validators/ticketSimilarityValidators');
const { doc } = require('../utils/apiDoc');

const router = express.Router();

router.post('/similar', 
  doc.post('/ticket-similarity/similar', 'Find similar tickets using AI vector search', ['AI Services', 'Ticket Analysis']),
  validateSimilarTicketsRequest,
  ticketController.findSimilarTickets
);

router.get('/similarity/health', 
  doc.get('/ticket-similarity/similarity/health', 'Check health status of AI similarity search service', ['AI Services', 'Health']),
  ticketController.checkHealth);

module.exports = router;
