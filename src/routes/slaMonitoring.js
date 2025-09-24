/**
 * SLA Monitoring Routes - Auto-documented
 * API endpoints for SLA monitoring operations
 */

const express = require('express');
const { 
  getMonitoringStatus, 
  startMonitoring, 
  stopMonitoring, 
  triggerManualCheck, 
  getMonitoringStats 
} = require('../controllers/slaMonitoringController');
const { doc } = require('../utils/apiDoc');

const router = express.Router();

// Get SLA monitoring service status
router.get('/status', 
  doc.get('/sla/monitoring/status', 'Get SLA monitoring service status and configuration', ['SLA Monitoring']),
  getMonitoringStatus);

// Start SLA monitoring service
router.post('/start', 
  doc.post('/sla/monitoring/start', 'Start the SLA monitoring service', ['SLA Monitoring']),
  startMonitoring);

// Stop SLA monitoring service
router.post('/stop', 
  doc.post('/sla/monitoring/stop', 'Stop the SLA monitoring service', ['SLA Monitoring']),
  stopMonitoring);

// Trigger manual SLA check
router.post('/check', 
  doc.post('/sla/monitoring/check', 'Trigger a manual SLA check for all open tickets', ['SLA Monitoring']),
  triggerManualCheck);

// Get SLA monitoring statistics
router.get('/stats', 
  doc.get('/sla/monitoring/stats', 'Get SLA monitoring statistics and distribution', ['SLA Monitoring']),
  getMonitoringStats);

module.exports = router;