// new file servicenow
const { pollingService } = require('../services/servicenowPollingService');

/**
 * Get polling service status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPollingStatus = async (req, res) => {
  try {
    const status = await pollingService.getStatus();
    
    res.status(200).json({
      success: true,
      message: 'Polling status retrieved successfully',
      data: status
    });
  } catch (error) {
    console.error('Error getting polling status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get polling status',
      error: error.message
    });
  }
};

/**
 * Perform ServiceNow health check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const performHealthCheck = async (req, res) => {
  try {
    console.log('Manual health check triggered via API');
    const healthCheck = await pollingService.performHealthCheckAndEmit();
    
    res.status(200).json({
      success: true,
      message: 'Health check completed',
      data: healthCheck
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform health check',
      error: error.message
    });
  }
};

/**
 * Start the polling service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startPolling = async (req, res) => {
  try {
    if (pollingService.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Polling service is already running'
      });
    }

    await pollingService.startPolling();
    
    res.status(200).json({
      success: true,
      message: 'Polling service started successfully'
    });
  } catch (error) {
    console.error('Error starting polling service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start polling service',
      error: error.message
    });
  }
};

/**
 * Stop the polling service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const stopPolling = async (req, res) => {
  try {
    if (!pollingService.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Polling service is not running'
      });
    }

    pollingService.stopPolling();
    
    res.status(200).json({
      success: true,
      message: 'Polling service stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping polling service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop polling service',
      error: error.message
    });
  }
};

/**
 * Trigger a manual poll
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const triggerManualPoll = async (req, res) => {
  try {
    await pollingService.triggerManualPoll();
    
    res.status(200).json({
      success: true,
      message: 'Manual poll triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering manual poll:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger manual poll',
      error: error.message
    });
  }
};

/**
 * Reset polling state (use with caution)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPollingState = async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: 'Please confirm the reset by sending { "confirm": true } in the request body'
      });
    }

    await pollingService.resetPollingState();
    
    res.status(200).json({
      success: true,
      message: 'Polling state reset successfully. Next poll will start from 24 hours ago.'
    });
  } catch (error) {
    console.error('Error resetting polling state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset polling state',
      error: error.message
    });
  }
};

module.exports = {
  getPollingStatus,
  performHealthCheck,
  startPolling,
  stopPolling,
  triggerManualPoll,
  resetPollingState
};
