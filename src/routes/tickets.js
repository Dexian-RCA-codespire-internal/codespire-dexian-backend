/**
 * Ticket Routes - Auto-documented with minimal configuration
 * API endpoints for ticket-related operations including similarity search and CRUD operations
 */

const express = require('express');
const { getTickets, getTicket, getTicketStatistics, updateTicket } = require('../controllers/ticketsController');
const { validateTicketUpdate, validateUpdateData } = require('../validators/ticketValidators');
// API documentation removed

const router = express.Router();

// Get all tickets with filtering and pagination
router.get('/', 
  getTickets);

// Get ticket statistics
router.get('/stats', 
  getTicketStatistics);

// Get specific ticket by ID
router.get('/:ticketId', 
  getTicket);

// Update specific ticket by ID (MongoDB _id preferred)
router.put('/:ticketId', 
  validateTicketUpdate,
  validateUpdateData,
  updateTicket);

module.exports = router;
