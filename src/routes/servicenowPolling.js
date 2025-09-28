/**
 * ServiceNow Polling Routes - Auto-documented
 * API endpoints for managing ServiceNow ticket polling and bulk import operations
 */

const express = require('express');
// API documentation removed
const router = express.Router();
const {
  getPollingStatus,
  performHealthCheck,
  startPolling,
  stopPolling,
  triggerManualPoll,
  resetPollingState
} = require('../controllers/servicenowPollingController');

const {
  bulkImportAllTickets,
  getBulkImportStatus,
  resetBulkImportState
} = require('../services/servicenowIngestionService');

// Polling Management Routes
router.get('/status', 
  getPollingStatus);

router.get('/health-check', 
  performHealthCheck);

router.post('/start', 
  startPolling);

router.post('/stop', 
  stopPolling);

router.post('/poll', 
  triggerManualPoll);

router.post('/reset', 
  resetPollingState);

// Bulk Import Management Routes
router.get('/bulk-import/status', 
  async (req, res) => {
    try {
      const status = await getBulkImportStatus();
      res.json({
        success: true,
        message: 'Bulk import status retrieved successfully',
        data: status
      });
    } catch (error) {
      console.error('Error getting bulk import status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bulk import status',
        error: error.message
      });
    }
  });

router.post('/bulk-import/start', 
  async (req, res) => {
    try {
      const { force = false, batchSize = 1000, query = '' } = req.body;
      
      console.log(`🔄 Manual bulk import triggered (force: ${force})`);
      
      const result = await bulkImportAllTickets({
        force: force,
        batchSize: batchSize,
        query: query
      });
      
      if (result.success) {
        if (result.skipped) {
          res.json({
            success: true,
            message: 'Bulk import skipped - already completed',
            data: result
          });
        } else {
          res.json({
            success: true,
            message: 'Bulk import completed successfully',
            data: result
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Bulk import failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error during manual bulk import:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk import',
        error: error.message
      });
    }
  });

router.post('/bulk-import/reset', 
  async (req, res) => {
    try {
      const { confirm } = req.body;
      
      if (!confirm) {
        return res.status(400).json({
          success: false,
          message: 'Confirmation required. Send { "confirm": true } in request body.'
        });
      }
      
      await resetBulkImportState();
      
      res.json({
        success: true,
        message: 'Bulk import state reset successfully. Next bulk import will run as if it\'s the first time.'
      });
    } catch (error) {
      console.error('Error resetting bulk import state:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset bulk import state',
        error: error.message
      });
    }
  });

// Vectorization Service Routes
router.get('/vectorization/health', 
  async (req, res) => {
    try {
      const ticketVectorizationService = require('../services/ticketVectorizationService');
      const health = await ticketVectorizationService.healthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: health.status === 'healthy',
        ...health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking vectorization health:', error);
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

module.exports = router;
