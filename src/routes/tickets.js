/**
 * Ticket Routes
 * API endpoints for ticket-related operations including similarity search and CRUD operations
 */

const express = require('express');
const { getTickets, getTicket, getTicketStatistics } = require('../controllers/ticketsController');


const router = express.Router();

// Ticket CRUD operations
// GET /api/tickets - Fetch all tickets from MongoDB
router.get('/', getTickets);

// GET /api/tickets/stats - Get ticket statistics
router.get('/stats', getTicketStatistics);

// GET /api/tickets/:ticketId - Get a specific ticket by ID
router.get('/:ticketId', getTicket);



module.exports = router;
