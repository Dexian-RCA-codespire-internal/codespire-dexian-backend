// new file servicenow
const cron = require('node-cron');
const { fetchTicketsAndSave } = require('./servicenowIngestionService');
const { webSocketService } = require('./websocketService');
const config = require('../config');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Create a schema for tracking polling state
const PollingStateSchema = new mongoose.Schema({
  service: { type: String, required: true, unique: true },
  lastSyncTime: { type: Date, required: true },
  lastSuccessfulPoll: { type: Date },
  totalPolls: { type: Number, default: 0 },
  successfulPolls: { type: Number, default: 0 },
  failedPolls: { type: Number, default: 0 },
  consecutiveFailures: { type: Number, default: 0 },
  lastError: { type: String },
  isActive: { type: Boolean, default: true },
  isHealthy: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'polling_states'
});

const PollingState = mongoose.model('PollingState', PollingStateSchema);

class ServiceNowPollingService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.pollingInterval = config.servicenow.pollingInterval || '*/1 * * * *'; // Every minute
    this.maxRetries = config.servicenow.maxRetries || 3;
    this.retryDelay = config.servicenow.retryDelay || 5000; // 5 seconds
    this.healthCheckInterval = null;
    this.healthCheckIntervalMinutes = 1; // Run health check every 1 minute
  }

  /**
   * Initialize the polling service
   */
  async initialize() {
    try {
      logger.info('Initializing ServiceNow polling service...');
      
      // Ensure polling state exists
      await this.ensurePollingState();
      
      // Start the cron job
      this.startPolling();
      
      // Start periodic health check
      this.startPeriodicHealthCheck();
      
      logger.info('✅ ServiceNow polling service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ServiceNow polling service:', error);
      throw error;
    }
  }

  /**
   * Ensure polling state document exists
   */
  async ensurePollingState() {
    const existingState = await PollingState.findOne({ service: 'servicenow' });
    
    if (!existingState) {
      // Create initial state with a timestamp from 24 hours ago
      const initialTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      await PollingState.create({
        service: 'servicenow',
        lastSyncTime: initialTimestamp,
        lastSuccessfulPoll: null,
        totalPolls: 0,
        successfulPolls: 0,
        failedPolls: 0,
        isActive: true
      });
      
      logger.info(`📅 Created initial polling state with timestamp: ${initialTimestamp.toISOString()}`);
    }
  }

  /**
   * Start the cron job for polling
   */
  startPolling() {
    if (this.cronJob) {
      logger.info('⚠️ Polling service is already running');
      return;
    }

    logger.info(`⏰ Starting ServiceNow polling with interval: ${this.pollingInterval}`);
    
    this.cronJob = cron.schedule(this.pollingInterval, async () => {
      await this.performPoll();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.cronJob.start();
    this.isRunning = true;
  }

  /**
   * Stop the polling service
   */
  stopPolling() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
    }
    
    // Stop periodic health check
    this.stopPeriodicHealthCheck();
    
    logger.info('ServiceNow polling service stopped');
  }

  /**
   * Step 1: Check if ServiceNow credentials are configured
   */
  checkCredentialsConfigured() {
    const hasUrl = !!config.servicenow.url;
    const hasUsername = !!config.servicenow.username;
    const hasPassword = !!config.servicenow.password;
    
    if (!hasUrl || !hasUsername || !hasPassword) {
      const missing = [];
      if (!hasUrl) missing.push('URL');
      if (!hasUsername) missing.push('Username');
      if (!hasPassword) missing.push('Password');
      throw new Error(`ServiceNow credentials not configured: Missing ${missing.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Step 2: Test ServiceNow API connectivity
   */
  async testServiceNowConnectivity() {
    try {
      const axios = require('axios');
      const testClient = axios.create({
        baseURL: config.servicenow.url,
        auth: {
          username: config.servicenow.username,
          password: config.servicenow.password
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000 // 15 second timeout for connectivity test
      });
      
      // Make a simple test call to verify connectivity
      const response = await testClient.get('/api/now/table/incident?sysparm_limit=1');
      
      if (response.status === 200) {
        return { success: true, message: 'ServiceNow API accessible' };
      } else {
        throw new Error(`ServiceNow API returned status: ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid ServiceNow credentials - authentication failed');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to ServiceNow instance - connection refused');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('ServiceNow URL not found - check URL configuration');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('ServiceNow connection timeout - check network connectivity');
      } else {
        throw new Error(`ServiceNow connectivity test failed: ${error.message}`);
      }
    }
  }

  /**
   * Step 3: Comprehensive ServiceNow health check (credentials + connectivity)
   */
  async performHealthCheck() {
    logger.info('Starting ServiceNow health check...');
    
    try {
      // Step 1: Check credentials
      logger.info('Step 1: Checking credentials configuration...');
      this.checkCredentialsConfigured();
      logger.info('✅ Credentials are configured');
      
      // Step 2: Test connectivity
      logger.info('Step 2: Testing ServiceNow API connectivity...');
      const connectivityResult = await this.testServiceNowConnectivity();
      logger.info(`✅ ${connectivityResult.message}`);
      
      // If we get here, everything is healthy
      logger.info('✅ ServiceNow health check passed - all systems operational');
      
      return {
        success: true,
        message: 'ServiceNow is healthy and accessible',
        steps: {
          credentialsConfigured: true,
          connectivityTest: true
        }
      };
      
    } catch (error) {
      console.error(`❌ ServiceNow health check failed: ${error.message}`);
      
      return {
        success: false,
        message: error.message,
        steps: {
          credentialsConfigured: error.message.includes('credentials not configured') ? false : true,
          connectivityTest: error.message.includes('credentials not configured') ? null : false
        }
      };
    }
  }

  /**
   * Start periodic health check that emits WebSocket events
   */
  startPeriodicHealthCheck() {
    if (this.healthCheckInterval) {
      logger.info('Periodic health check already running');
      return;
    }

    logger.info(`Starting periodic health check every ${this.healthCheckIntervalMinutes} minute(s)`);
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        logger.info('Running periodic ServiceNow health check...');
        await this.performHealthCheckAndEmit();
        logger.info('✅ Periodic health check completed');
      } catch (error) {
        console.error('❌ Periodic health check error:', error);
      }
    }, this.healthCheckIntervalMinutes * 60 * 1000); // Convert minutes to milliseconds
  }

  /**
   * Stop periodic health check
   */
  stopPeriodicHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Periodic health check stopped');
    }
  }

  /**
   * Perform health check and emit WebSocket event with result
   */
  async performHealthCheckAndEmit() {
    const healthCheck = await this.performHealthCheck();
    
    if (healthCheck.success) {
      // Health check passed - update database and emit success
      await PollingState.updateOne(
        { service: 'servicenow' },
        {
          $set: {
            isActive: true,
            isHealthy: true,
            consecutiveFailures: 0,
            lastError: null
          }
        },
        { upsert: true }
      );
      
      // Emit WebSocket status update
      webSocketService.emitPollingStatus({
        timestamp: new Date(),
        status: 'healthy',
        isActive: true,
        isHealthy: true,
        message: healthCheck.message
      });
    } else {
      // Health check failed - update database and emit error
      await PollingState.updateOne(
        { service: 'servicenow' },
        {
          $set: {
            isActive: false,
            isHealthy: false,
            consecutiveFailures: 1,
            lastError: healthCheck.message
          }
        },
        { upsert: true }
      );
      
      // Emit WebSocket status update immediately
      webSocketService.emitPollingStatus({
        timestamp: new Date(),
        status: 'error',
        isActive: false,
        isHealthy: false,
        message: healthCheck.message
      });
    }
    
    return healthCheck;
  }

  /**
   * Legacy method for backward compatibility
   */
  async validateCredentials() {
    const healthCheck = await this.performHealthCheck();
    
    if (!healthCheck.success) {
      // Health check failed - emit WebSocket event immediately
      await PollingState.updateOne(
        { service: 'servicenow' },
        {
          $set: {
            isActive: false,
            isHealthy: false,
            consecutiveFailures: 1,
            lastError: healthCheck.message
          }
        },
        { upsert: true }
      );
      
      // Emit WebSocket status update immediately
      webSocketService.emitPollingStatus({
        timestamp: new Date(),
        status: 'error',
        isActive: false,
        isHealthy: false,
        message: healthCheck.message
      });
      
      throw new Error(healthCheck.message);
    }
    
    return true;
  }

  /**
   * Perform a single poll operation
   */
  async performPoll() {
    if (!this.isRunning) return;

    try {
      logger.info('Starting ServiceNow poll...');
      
      // Get current polling state
      const pollingState = await PollingState.findOne({ service: 'servicenow' });
      if (!pollingState || !pollingState.isActive) {
        logger.info('⚠️ Polling is disabled or state not found');
        // Emit polling status even when disabled
        webSocketService.emitPollingStatus({
          timestamp: new Date(),
          status: 'disabled',
          isActive: false,
          isHealthy: false,
          error: 'Polling is disabled'
        });
        return;
      }

      // Emit polling started event
      webSocketService.emitPollingStatus({
        timestamp: new Date(),
        status: 'polling',
        isActive: true,
        isHealthy: pollingState?.isHealthy ?? true,
        message: 'Polling started'
      });

      // Validate credentials before attempting poll
      await this.validateCredentials();

      // Update total polls count
      await PollingState.updateOne(
        { service: 'servicenow' },
        { $inc: { totalPolls: 1 } }
      );

      // Create query for new/updated tickets since last sync
      const lastSyncTime = pollingState.lastSyncTime;
      const currentTime = new Date();
      
      // ServiceNow query for tickets created or updated since last sync
      const query = `sys_created_on>=${this.formatServiceNowDate(lastSyncTime)}^ORsys_updated_on>=${this.formatServiceNowDate(lastSyncTime)}`;
      
      logger.info(`Polling for tickets since: ${lastSyncTime.toISOString()}`);
      
      // Fetch tickets with the timestamp filter and save to database
      const result = await fetchTicketsAndSave({
        query: query,
        limit: config.servicenow.pollingBatchSize || 100
      });

      if (result.success) {
        const newTicketsCount = result.database?.saved || 0;
        const updatedTicketsCount = result.database?.updated || 0;
        
        logger.info(`✅ Poll completed successfully:`);
        logger.info(`   - New tickets: ${newTicketsCount}`);
        logger.info(`   - Updated tickets: ${updatedTicketsCount}`);
        logger.info(`   - Total processed: ${result.total}`);

        // Update polling state with successful poll
        await PollingState.updateOne(
          { service: 'servicenow' },
          {
            $set: {
              lastSyncTime: currentTime,
              lastSuccessfulPoll: currentTime,
              lastError: null,
              consecutiveFailures: 0,
              isHealthy: true,
              isActive: true
            },
            $inc: { successfulPolls: 1 }
          }
        );

        // Emit event for real-time updates (if needed)
        this.emitPollingEvent('success', {
          newTickets: newTicketsCount,
          updatedTickets: updatedTicketsCount,
          totalProcessed: result.total,
          timestamp: currentTime
        });

        // Emit polling completed event (always emit, regardless of ticket count)
        webSocketService.emitPollingStatus({
          timestamp: new Date(),
          status: 'completed',
          isActive: true,
          isHealthy: true,
          message: `Poll completed - ${newTicketsCount} new, ${updatedTicketsCount} updated`,
          newTickets: newTicketsCount,
          updatedTickets: updatedTicketsCount
        });

        // Emit notification for new tickets
        if (newTicketsCount > 0) {
          webSocketService.emitNotification(
            `${newTicketsCount} new ticket${newTicketsCount > 1 ? 's' : ''} found from ServiceNow`,
            'success'
          );
        }

      } else {
        throw new Error(result.error || 'Unknown error during polling');
      }

    } catch (error) {
      console.error('❌ Polling failed:', error.message);
      
      // Update polling state with error and track consecutive failures
      const pollingState = await PollingState.findOne({ service: 'servicenow' });
      const consecutiveFailures = (pollingState?.consecutiveFailures || 0) + 1;
      const isHealthy = consecutiveFailures < 1; // Disconnect after 1 failure
      
      await PollingState.updateOne(
        { service: 'servicenow' },
        {
          $set: { 
            lastError: error.message,
            consecutiveFailures: consecutiveFailures,
            isHealthy: isHealthy,
            isActive: isHealthy // Disable polling if unhealthy
          },
          $inc: { failedPolls: 1 }
        }
      );

      // Emit error event
      this.emitPollingEvent('error', {
        error: error.message,
        timestamp: new Date()
      });

      // Emit WebSocket error event
      webSocketService.emitPollingStatus({
        error: error.message,
        timestamp: new Date(),
        status: isHealthy ? 'warning' : 'error',
        consecutiveFailures: consecutiveFailures,
        isHealthy: isHealthy,
        isActive: isHealthy,
        message: `Poll failed: ${error.message}`
      });


      // Implement retry logic if needed
      await this.handlePollingError(error);
    }
  }

  /**
   * Handle polling errors with retry logic
   */
  async handlePollingError(error) {
    const pollingState = await PollingState.findOne({ service: 'servicenow' });
    const consecutiveFailures = pollingState?.consecutiveFailures || 0;

    if (consecutiveFailures >= 1) {
      console.error(`🚨 ServiceNow polling failed. Marking as disconnected.`);
      
      // Mark as disconnected after 1 failure
      await PollingState.updateOne(
        { service: 'servicenow' },
        { 
          $set: { 
            isActive: false,
            isHealthy: false
          }
        }
      );
      
      // Emit WebSocket status update for frontend
      webSocketService.emitPollingStatus({
        error: error.message,
        timestamp: new Date(),
        status: 'error',
        consecutiveFailures: consecutiveFailures,
        isHealthy: false,
        isActive: false
      });
      
      // You might want to send an alert here
      this.emitPollingEvent('max_retries_reached', {
        error: error.message,
        consecutiveFailures,
        timestamp: new Date()
      });
    }
  }

  /**
   * Format date for ServiceNow query
   */
  formatServiceNowDate(date) {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  /**
   * Emit polling events (can be extended for real-time notifications)
   */
  emitPollingEvent(eventType, data) {
    // This can be extended to emit events to WebSocket clients, etc.
    logger.info(`Polling event: ${eventType}`, data);
  }

  /**
   * Reset polling status based on health check (used on server startup)
   */
  async resetPollingStatus() {
    try {
      // Perform immediate health check
      const healthCheck = await this.performHealthCheck();
      
      if (healthCheck.success) {
        // Health check passed - set to healthy
        await PollingState.updateOne(
          { service: 'servicenow' },
          {
            $set: {
              isActive: true,
              isHealthy: true,
              consecutiveFailures: 0,
              lastError: null
            }
          },
          { upsert: true }
        );
        
        // Emit WebSocket status update
        webSocketService.emitPollingStatus({
          timestamp: new Date(),
          status: 'healthy',
          isActive: true,
          isHealthy: true,
          message: 'ServiceNow health check passed - system operational'
        });
        
        logger.info('✅ ServiceNow health check passed - polling status set to healthy');
      } else {
        // Health check failed - set to unhealthy
        await PollingState.updateOne(
          { service: 'servicenow' },
          {
            $set: {
              isActive: false,
              isHealthy: false,
              consecutiveFailures: 1,
              lastError: healthCheck.message
            }
          },
          { upsert: true }
        );
        
        // Emit WebSocket status update
        webSocketService.emitPollingStatus({
          timestamp: new Date(),
          status: 'error',
          isActive: false,
          isHealthy: false,
          message: healthCheck.message
        });
        
        logger.warn(`❌ ServiceNow health check failed - polling status set to unhealthy: ${healthCheck.message}`);
      }
    } catch (error) {
      console.error('❌ Failed to perform health check:', error);
      
      // If health check itself fails, set to unhealthy
      await PollingState.updateOne(
        { service: 'servicenow' },
        {
          $set: {
            isActive: false,
            isHealthy: false,
            consecutiveFailures: 1,
            lastError: `Health check failed: ${error.message}`
          }
        },
        { upsert: true }
      );
      
      // Emit WebSocket status update
      webSocketService.emitPollingStatus({
        timestamp: new Date(),
        status: 'error',
        isActive: false,
        isHealthy: false,
        message: `Health check failed: ${error.message}`
      });
      
      throw error;
    }
  }

  /**
   * Get polling status
   */
  async getStatus() {
    const pollingState = await PollingState.findOne({ service: 'servicenow' });
    
    return {
      isRunning: this.isRunning,
      isActive: pollingState?.isActive || false,
      isHealthy: pollingState?.isHealthy ?? true,
      lastSyncTime: pollingState?.lastSyncTime,
      lastSuccessfulPoll: pollingState?.lastSuccessfulPoll,
      totalPolls: pollingState?.totalPolls || 0,
      successfulPolls: pollingState?.successfulPolls || 0,
      failedPolls: pollingState?.failedPolls || 0,
      consecutiveFailures: pollingState?.consecutiveFailures || 0,
      lastError: pollingState?.lastError,
      pollingInterval: this.pollingInterval
    };
  }

  /**
   * Manually trigger a poll (for testing or manual sync)
   */
  async triggerManualPoll() {
    logger.info('Manual poll triggered');
    await this.performPoll();
  }

  /**
   * Reset polling state (use with caution)
   */
  async resetPollingState() {
    const initialTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    await PollingState.updateOne(
      { service: 'servicenow' },
      {
        $set: {
          lastSyncTime: initialTimestamp,
          lastSuccessfulPoll: null,
          totalPolls: 0,
          successfulPolls: 0,
          failedPolls: 0,
          lastError: null,
          isActive: true
        }
      }
    );
    
    logger.info('Polling state reset to 24 hours ago');
  }
}

// Create singleton instance
const pollingService = new ServiceNowPollingService();

module.exports = {
  ServiceNowPollingService,
  pollingService,
  PollingState
};
