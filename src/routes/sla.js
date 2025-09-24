/**
 * SLA Routes - Auto-documented
 * API endpoints for SLA-related operations including tracking and statistics
 */

const express = require('express');
const { getSLAs, getSLAByTicket, getSLAStatistics, deleteSLA } = require('../controllers/slaController');
const { validateSLAQuery, validateSLAByTicket, validateDateRange } = require('../validators/slaValidators');
const { doc } = require('../utils/apiDoc');

const router = express.Router();

// Get all SLA records with filtering and pagination
router.get('/', 
  doc.getList('/sla', 'Retrieve all SLA records with pagination and filtering', ['SLA']),
  validateSLAQuery,
  validateDateRange,
  getSLAs);

// Get SLA statistics
router.get('/stats', 
  doc.get('/sla/stats', 'Get aggregated statistics for all SLA records in the system', ['SLA']),
  getSLAStatistics);

// Get SLA record by ticket ID
router.get('/ticket/:ticketId', 
  doc.getById('/sla/ticket/{ticketId}', 'Retrieve SLA record by ticket ID', ['SLA']),
  validateSLAByTicket,
  getSLAByTicket);

// Delete SLA record by ticket ID
router.delete('/ticket/:ticketId', 
  doc.delete('/sla/ticket/{ticketId}', 'Delete SLA record by ticket ID', ['SLA']),
  validateSLAByTicket,
  deleteSLA);

module.exports = router;