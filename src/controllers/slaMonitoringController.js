/**
 * SLA Monitoring Controller
 * HTTP handlers for SLA monitoring operations
 */

const { slaMonitoringService } = require('../services/slaMonitoringService');

/**
 * Get SLA monitoring service status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMonitoringStatus = async (req, res) => {
  try {
    const status = slaMonitoringService.getStatus();
    
    res.status(200).json({
      success: true,
      message: 'SLA monitoring status retrieved successfully',
      data: status
    });
  } catch (error) {
    console.error('Error getting SLA monitoring status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Start SLA monitoring service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startMonitoring = async (req, res) => {
  try {
    slaMonitoringService.startMonitoring();
    
    res.status(200).json({
      success: true,
      message: 'SLA monitoring service started successfully',
      data: { isRunning: true }
    });
  } catch (error) {
    console.error('Error starting SLA monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start SLA monitoring',
      error: error.message
    });
  }
};

/**
 * Stop SLA monitoring service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const stopMonitoring = async (req, res) => {
  try {
    slaMonitoringService.stopMonitoring();
    
    res.status(200).json({
      success: true,
      message: 'SLA monitoring service stopped successfully',
      data: { isRunning: false }
    });
  } catch (error) {
    console.error('Error stopping SLA monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop SLA monitoring',
      error: error.message
    });
  }
};

/**
 * Trigger manual SLA check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const triggerManualCheck = async (req, res) => {
  try {
    // Trigger manual check in background
    slaMonitoringService.triggerManualCheck().catch(error => {
      console.error('Manual SLA check error:', error);
    });
    
    res.status(200).json({
      success: true,
      message: 'Manual SLA check triggered successfully',
      data: { triggered: true }
    });
  } catch (error) {
    console.error('Error triggering manual SLA check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger manual SLA check',
      error: error.message
    });
  }
};

/**
 * Get SLA monitoring statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMonitoringStats = async (req, res) => {
  try {
    const stats = await slaMonitoringService.getSLAMonitoringStats();
    
    if (stats === null) {
      throw new Error('Failed to retrieve SLA monitoring statistics');
    }
    
    res.status(200).json({
      success: true,
      message: 'SLA monitoring statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error getting SLA monitoring statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getMonitoringStatus,
  startMonitoring,
  stopMonitoring,
  triggerManualCheck,
  getMonitoringStats
};