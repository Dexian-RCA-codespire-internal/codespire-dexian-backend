/**
 * Ticket Routes - Auto-documented with minimal configuration
 * API endpoints for ticket-related operations including similarity search and CRUD operations
 */

const express = require('express');
const { getTickets, getTicket, getTicketStatistics, updateTicket } = require('../controllers/ticketsController');
const { validateTicketUpdate, validateUpdateData } = require('../validators/ticketValidators');
const { doc, params } = require('../utils/apiDoc');

const router = express.Router();

// Get all tickets with filtering and pagination
router.get('/', 
  doc.getList('/tickets', 'Retrieve all tickets from ServiceNow with pagination', ['Tickets']),
  getTickets);

// Get ticket statistics
router.get('/stats', 
  doc.get('/tickets/stats', 'Get aggregated statistics for all tickets in the system', ['Tickets']),
  getTicketStatistics);

// Get specific ticket by ID
router.get('/:ticketId', 
  doc.getById('/tickets/{ticketId}', 'Retrieve a specific ticket by its ID or ServiceNow number', ['Tickets']),
  getTicket);

// Update specific ticket by ID (MongoDB _id preferred)
router.put('/:ticketId', 
  doc.update('/tickets/{ticketId}', 'Update a specific ticket by its MongoDB _id (primary) or ServiceNow ticket_id (fallback)', ['Tickets']),
  validateTicketUpdate,
  validateUpdateData,
  updateTicket);

module.exports = router;
