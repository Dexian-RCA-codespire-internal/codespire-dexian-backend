// new file servicenow
const cron = require('node-cron');
const { fetchTickets } = require('./servicenowIngestionService');
const config = require('../config');
const mongoose = require('mongoose');

// Create a schema for tracking polling state
const PollingStateSchema = new mongoose.Schema({
  service: { type: String, required: true, unique: true },
  lastSyncTime: { type: Date, required: true },
  lastSuccessfulPoll: { type: Date },
  totalPolls: { type: Number, default: 0 },
  successfulPolls: { type: Number, default: 0 },
  failedPolls: { type: Number, default: 0 },
  lastError: { type: String },
  isActive: { type: Boolean, default: true }
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
  }

  /**
   * Initialize the polling service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing ServiceNow polling service...');
      
      // Ensure polling state exists
      await this.ensurePollingState();
      
      // Start the cron job
      this.startPolling();
      
      console.log('✅ ServiceNow polling service initialized successfully');
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
      
      console.log(`📅 Created initial polling state with timestamp: ${initialTimestamp.toISOString()}`);
    }
  }

  /**
   * Start the cron job for polling
   */
  startPolling() {
    if (this.cronJob) {
      console.log('⚠️ Polling service is already running');
      return;
    }

    console.log(`⏰ Starting ServiceNow polling with interval: ${this.pollingInterval}`);
    
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
      console.log('⏹️ ServiceNow polling service stopped');
    }
  }

  /**
   * Perform a single poll operation
   */
  async performPoll() {
    if (!this.isRunning) return;

    try {
      console.log('🔄 Starting ServiceNow poll...');
      
      // Get current polling state
      const pollingState = await PollingState.findOne({ service: 'servicenow' });
      if (!pollingState || !pollingState.isActive) {
        console.log('⚠️ Polling is disabled or state not found');
        return;
      }

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
      
      console.log(`🔍 Polling for tickets since: ${lastSyncTime.toISOString()}`);
      
      // Fetch tickets with the timestamp filter
      const result = await fetchTickets({
        query: query,
        limit: config.servicenow.pollingBatchSize || 100
      });

      if (result.success) {
        const newTicketsCount = result.database?.saved || 0;
        const updatedTicketsCount = result.database?.updated || 0;
        
        console.log(`✅ Poll completed successfully:`);
        console.log(`   - New tickets: ${newTicketsCount}`);
        console.log(`   - Updated tickets: ${updatedTicketsCount}`);
        console.log(`   - Total processed: ${result.total}`);

        // Update polling state with successful poll
        await PollingState.updateOne(
          { service: 'servicenow' },
          {
            $set: {
              lastSyncTime: currentTime,
              lastSuccessfulPoll: currentTime,
              lastError: null
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

      } else {
        throw new Error(result.error || 'Unknown error during polling');
      }

    } catch (error) {
      console.error('❌ Polling failed:', error.message);
      
      // Update polling state with error
      await PollingState.updateOne(
        { service: 'servicenow' },
        {
          $set: { lastError: error.message },
          $inc: { failedPolls: 1 }
        }
      );

      // Emit error event
      this.emitPollingEvent('error', {
        error: error.message,
        timestamp: new Date()
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
    const consecutiveFailures = pollingState?.failedPolls || 0;

    if (consecutiveFailures >= this.maxRetries) {
      console.error(`🚨 Maximum retry attempts (${this.maxRetries}) reached. Disabling polling.`);
      
      // Disable polling after max retries
      await PollingState.updateOne(
        { service: 'servicenow' },
        { $set: { isActive: false } }
      );
      
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
    console.log(`📡 Polling event: ${eventType}`, data);
  }

  /**
   * Get polling status
   */
  async getStatus() {
    const pollingState = await PollingState.findOne({ service: 'servicenow' });
    
    return {
      isRunning: this.isRunning,
      isActive: pollingState?.isActive || false,
      lastSyncTime: pollingState?.lastSyncTime,
      lastSuccessfulPoll: pollingState?.lastSuccessfulPoll,
      totalPolls: pollingState?.totalPolls || 0,
      successfulPolls: pollingState?.successfulPolls || 0,
      failedPolls: pollingState?.failedPolls || 0,
      lastError: pollingState?.lastError,
      pollingInterval: this.pollingInterval
    };
  }

  /**
   * Manually trigger a poll (for testing or manual sync)
   */
  async triggerManualPoll() {
    console.log('🔧 Manual poll triggered');
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
    
    console.log('🔄 Polling state reset to 24 hours ago');
  }
}

// Create singleton instance
const pollingService = new ServiceNowPollingService();

module.exports = {
  ServiceNowPollingService,
  pollingService,
  PollingState
};
