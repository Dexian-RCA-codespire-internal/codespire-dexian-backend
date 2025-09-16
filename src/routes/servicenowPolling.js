/**
 * ServiceNow Polling Routes - Auto-documented
 * API endpoints for managing ServiceNow ticket polling and bulk import operations
 */

const express = require('express');
const { doc } = require('../utils/apiDoc');
const router = express.Router();
const {
  getPollingStatus,
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
  doc.get('/servicenow-polling/status', 'Get current status of ServiceNow polling service', ['ServiceNow', 'Polling']),
  getPollingStatus);

router.post('/start', 
  doc.post('/servicenow-polling/start', 'Start the ServiceNow ticket polling service', ['ServiceNow', 'Polling']),
  startPolling);

router.post('/stop', 
  doc.post('/servicenow-polling/stop', 'Stop the ServiceNow ticket polling service', ['ServiceNow', 'Polling']),
  stopPolling);

router.post('/poll', 
  doc.post('/servicenow-polling/poll', 'Trigger a manual poll for new/updated tickets', ['ServiceNow', 'Polling']),
  triggerManualPoll);

router.post('/reset', 
  doc.post('/servicenow-polling/reset', 'Reset polling state (use with caution - this will clear polling history)', ['ServiceNow', 'Polling']),
  resetPollingState);

// Bulk Import Management Routes
router.get('/bulk-import/status', 
  doc.get('/servicenow-polling/bulk-import/status', 'Get status of bulk import operations', ['ServiceNow', 'Bulk Import']),
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
  doc.post('/servicenow-polling/bulk-import/start', 'Start manual bulk import of tickets from ServiceNow', ['ServiceNow', 'Bulk Import']),
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
  doc.post('/servicenow-polling/bulk-import/reset', 'Reset bulk import state (dangerous operation)', ['ServiceNow', 'Bulk Import']),
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
  doc.get('/servicenow-polling/vectorization/health', 'Check health status of ticket vectorization service', ['ServiceNow', 'Vectorization']),
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
