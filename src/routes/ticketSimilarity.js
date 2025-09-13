/**
 * Ticket Routes
 * API endpoints for ticket-related operations including similarity search and CRUD operations
 */

const express = require('express');
const ticketController = require('../controllers/ticketSimilarityController');
const { validateSimilarTicketsRequest } = require('../validators/ticketSimilarityValidators');

const router = express.Router();

router.post('/similar', 
    validateSimilarTicketsRequest,
    ticketController.findSimilarTickets
);

// GET /api/tickets/similarity/health - Health check for the ticket similarity service
router.get('/similarity/health', ticketController.checkHealth);

module.exports = router;
