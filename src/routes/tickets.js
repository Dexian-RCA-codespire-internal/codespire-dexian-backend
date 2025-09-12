// new file servicenow
const express = require('express');
const router = express.Router();
const { getTickets, getTicket, getTicketStatistics } = require('../controllers/ticketsController');

// GET /api/v1/tickets - Fetch all tickets from MongoDB
router.get('/', getTickets);

// GET /api/v1/tickets/stats - Get ticket statistics
router.get('/stats', getTicketStatistics);

// GET /api/v1/tickets/:ticketId - Get a specific ticket by ID
router.get('/:ticketId', getTicket);

module.exports = router;
