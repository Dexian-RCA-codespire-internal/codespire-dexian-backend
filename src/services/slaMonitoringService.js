/**
 * SLA Monitoring Service
 * Monitors SLA status for open tickets and sends notifications when they enter different phases
 */

require('dotenv').config(); // Ensure environment variables are loaded
const cron = require('node-cron');
const SLA = require('../models/SLA');
const { notificationService } = require('./notificationService');
const { webSocketService } = require('./websocketService');
const emailService = require('./emailService');
const moment = require('moment-timezone');

class SLAMonitoringService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    // Monitor every 5 minutes by default, configurable via environment
    this.monitoringInterval = process.env.SLA_MONITORING_INTERVAL || '*/5 * * * *';
    this.timezone = 'UTC';
    
    // SLA targets in hours (configurable via environment)
    this.slaTargets = {
      'P1': parseInt(process.env.SLA_P1_HOURS) || 4,
      'P2': parseInt(process.env.SLA_P2_HOURS) || 12,
      'P3': parseInt(process.env.SLA_P3_HOURS) || 24
    };
    
    // Notification thresholds (configurable via environment)
    this.warningThreshold = parseInt(process.env.SLA_WARNING_THRESHOLD) || 20; // 20%
    this.criticalThreshold = parseInt(process.env.SLA_CRITICAL_THRESHOLD) || 60; // 60%
    
    // Enable/disable monitoring
    this.isEnabled = process.env.SLA_MONITORING_ENABLED !== 'false';
    
    console.log('🔧 SLA Monitoring Configuration:');
    console.log(`   - Interval: ${this.monitoringInterval}`);
    console.log(`   - SLA Targets: P1=${this.slaTargets.P1}h, P2=${this.slaTargets.P2}h, P3=${this.slaTargets.P3}h`);
    console.log(`   - Thresholds: Warning=${this.warningThreshold}%, Critical=${this.criticalThreshold}%`);
    console.log(`   - Enabled: ${this.isEnabled}`);
  }

  /**
   * Initialize the SLA monitoring service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing SLA monitoring service...');
      
      // Check if SLA monitoring is enabled
      if (!this.isEnabled) {
        console.log('⚠️ SLA monitoring is disabled via environment variable SLA_MONITORING_ENABLED=false');
        return;
      }
      
      // Start the monitoring cron job
      this.startMonitoring();
      
      console.log('✅ SLA monitoring service initialized successfully');
      console.log(`⏰ Monitoring interval: ${this.monitoringInterval}`);
    } catch (error) {
      console.error('❌ Failed to initialize SLA monitoring service:', error);
      throw error;
    }
  }

  /**
   * Start the cron job for SLA monitoring
   */
  startMonitoring() {
    if (this.cronJob) {
      console.log('⚠️ SLA monitoring service is already running');
      return;
    }

    console.log(`⏰ Starting SLA monitoring with interval: ${this.monitoringInterval}`);
    
    this.cronJob = cron.schedule(this.monitoringInterval, async () => {
      await this.performScheduledSLACheck();
    }, {
      scheduled: false,
      timezone: this.timezone
    });

    this.cronJob.start();
    this.isRunning = true;
    console.log('✅ SLA monitoring cron job started');
  }

  /**
   * Stop the SLA monitoring service
   */
  stopMonitoring() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('⏹️ SLA monitoring service stopped');
    }
  }

  /**
   * Perform scheduled SLA check (only if service is running)
   */
  async performScheduledSLACheck() {
    if (!this.isRunning) {
      console.log('⏸️ SLA monitoring service is not running, skipping scheduled check');
      return;
    }
    
    await this.performSLACheck();
  }

  /**
   * Perform SLA check for all open tickets
   */
  async performSLACheck() {
    try {
      console.log('🔍 Starting SLA monitoring check...');
      
      // Get all open SLA records (tickets that haven't breached yet)
      const openSLAs = await this.getOpenSLARecords();
      
      if (openSLAs.length === 0) {
        console.log('ℹ️ No open SLA records found to monitor');
        return;
      }

      console.log(`📊 Found ${openSLAs.length} open SLA records to monitor`);
      
      let processedCount = 0;
      let notificationsSent = 0;
      
      // Process each SLA record
      for (const sla of openSLAs) {
        try {
          const result = await this.processSLARecord(sla);
          if (result.notificationSent) {
            notificationsSent++;
          }
          processedCount++;
        } catch (error) {
          console.error(`❌ Error processing SLA for ticket ${sla.ticket_id}:`, error.message);
        }
      }
      
      console.log(`✅ SLA monitoring check completed: ${processedCount}/${openSLAs.length} processed, ${notificationsSent} notifications sent`);
      
      // Emit monitoring status via WebSocket only if initialized
      try {
        webSocketService.emitNotification(
          `SLA monitoring completed: ${processedCount} tickets checked, ${notificationsSent} notifications sent`,
          'info'
        );
      } catch (wsError) {
        console.warn('⚠️ Could not emit WebSocket notification:', wsError.message);
      }
      
    } catch (error) {
      console.error('❌ Error in SLA monitoring check:', error);
      
      // Emit error status via WebSocket only if initialized
      try {
        webSocketService.emitNotification(
          `SLA monitoring error: ${error.message}`,
          'error'
        );
      } catch (wsError) {
        console.warn('⚠️ Could not emit WebSocket error notification:', wsError.message);
      }
    }
  }

  /**
   * Get all open SLA records that need monitoring
   * @returns {Array} Array of open SLA records
   */
  async getOpenSLARecords() {
    try {
      // Read environment variable dynamically
      const ignoreStatusFilter = process.env.SLA_IGNORE_STATUS_FILTER === 'true';
      console.log('🔍 SLA_IGNORE_STATUS_FILTER environment variable:', process.env.SLA_IGNORE_STATUS_FILTER);
      console.log('🔍 Ignore status filter flag:', ignoreStatusFilter);
      
      let query;
      
      if (ignoreStatusFilter) {
        // Process ALL SLA records (except already breached ones)
        console.log('🔍 SLA_IGNORE_STATUS_FILTER=true - Processing ALL SLA records');
        query = {
          last_notification_status: { $ne: 'breached' } // Only exclude already breached tickets
        };
      } else {
        // Use status filtering (original behavior)
        console.log('🔍 Using status filtering for SLA records');
        const closedStatuses = ['closed', 'resolved', 'completed', 'cancelled', 'done', 'finished'];
        query = {
          status: { 
            $not: { $regex: new RegExp(`^(${closedStatuses.join('|')})$`, 'i') }
          },
          last_notification_status: { $ne: 'breached' }
        };
      }
      
      console.log('🔍 Query for open SLA records:', JSON.stringify(query, null, 2));
      
      // Get SLA records
      const slas = await SLA.find(query).sort({ opened_time: 1 }); // Process oldest first
      
      console.log(`� Found ${slas.length} SLA records to monitor`);
      if (slas.length > 0) {
        console.log('📋 Records found:');
        // slas.forEach(sla => {
        //   console.log(`   - ${sla.ticket_id}: ${sla.status}, last_notification: ${sla.last_notification_status}`);
        // });
      }
      
      return slas;
    } catch (error) {
      console.error('❌ Error fetching open SLA records:', error);
      return [];
    }
  }

  /**
   * Process a single SLA record and send notification if needed
   * @param {Object} sla - SLA record from database
   * @returns {Object} Result with notification status
   */
  async processSLARecord(sla) {
    try {

      
      // Calculate current SLA status
      const currentStatus = this.calculateSLAStatus(sla.opened_time, sla.priority, sla.status);

      
      // Check if status has changed and notification is needed
      const shouldSendNotification = this.shouldSendNotification(sla, currentStatus);

      
      if (!shouldSendNotification) {
        return { notificationSent: false, currentStatus: currentStatus.status };
      }
      
      // Send notification
      await this.sendSLANotification(sla, currentStatus);
      
      // Update SLA record with new notification status
      await this.updateSLANotificationStatus(sla, currentStatus.status);
      
      console.log(`📢 SLA notification sent for ticket ${sla.ticket_id}: ${currentStatus.status}`);
      
      return { notificationSent: true, currentStatus: currentStatus.status };
      
    } catch (error) {
      console.error(`❌ Error processing SLA record for ticket ${sla.ticket_id}:`, error);
      return { notificationSent: false, error: error.message };
    }
  }

  /**
   * Calculate SLA status based on time elapsed and priority
   * @param {Date} openedTime - When ticket was opened (UTC)
   * @param {String} priority - Ticket priority (P1, P2, P3)
   * @param {String} status - Current ticket status
   * @returns {Object} SLA status information
   */
  calculateSLAStatus(openedTime, priority, status) {
    if (!openedTime) return { status: 'unknown', timeLeft: 'Unknown', isBreached: false, hoursLeft: 0, percentage: 0 };

    // If ticket is closed/resolved, mark as completed
    const closedStatuses = ['closed', 'resolved', 'completed', 'cancelled'];
    if (closedStatuses.includes(status?.toLowerCase())) {
      return {
        status: 'completed',
        timeLeft: 'Completed',
        isBreached: false,
        hoursLeft: 0,
        percentage: 100
      };
    }

    // Use configurable SLA targets
    const targetHours = this.slaTargets[priority] || this.slaTargets['P3']; // Default to P3
    
    // Parse the opened time properly
    let openedDate;
    if (typeof openedTime === 'object' && openedTime.$date) {
      openedDate = new Date(openedTime.$date);
    } else {
      openedDate = new Date(openedTime);
    }
    
    if (isNaN(openedDate.getTime())) {
      console.error('Failed to parse opened time in calculateSLAStatus:', openedTime);
      return { status: 'unknown', timeLeft: 'Unknown', isBreached: false, hoursLeft: 0, percentage: 0 };
    }
    
    const currentDate = new Date();
    
    // Calculate time elapsed since ticket was opened (both in UTC)
    const timeElapsed = currentDate.getTime() - openedDate.getTime();
    const totalSLATimeMs = targetHours * 60 * 60 * 1000; // Total SLA time in milliseconds
    
    // Calculate percentage of time that has elapsed
    const timeElapsedPercentage = timeElapsed / totalSLATimeMs;

    // If 100% or more time has passed, it's breached
    if (timeElapsedPercentage >= 1.0) {
      const overdueDuration = timeElapsed - totalSLATimeMs;
      const hoursOverdue = Math.floor(overdueDuration / (1000 * 60 * 60));
      return {
        status: 'breached',
        timeLeft: `Overdue by ${hoursOverdue}h`,
        isBreached: true,
        hoursLeft: -(hoursOverdue),
        percentage: Math.round(timeElapsedPercentage * 100)
      };
    }

    // Calculate time remaining
    const timeRemaining = totalSLATimeMs - timeElapsed;
    const hoursLeft = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    // Format time left
    let timeLeftString = '';
    if (hoursLeft > 0) {
      timeLeftString = `${hoursLeft}h ${minutesLeft}m`;
    } else {
      timeLeftString = `${minutesLeft}m`;
    }

    // Determine status based on configurable thresholds
    let statusType = 'safe';
    const percentageElapsed = timeElapsedPercentage * 100;
    
    if (percentageElapsed >= this.warningThreshold && percentageElapsed < this.criticalThreshold) {
      statusType = 'warning';
    } else if (percentageElapsed >= this.criticalThreshold) {
      statusType = 'critical';
    }

    return {
      status: statusType,
      timeLeft: timeLeftString,
      isBreached: false,
      hoursLeft: hoursLeft,
      percentage: Math.round(percentageElapsed)
    };
  }

  /**
   * Check if notification should be sent for SLA status change
   * @param {Object} sla - SLA record
   * @param {Object} currentStatus - Current calculated SLA status
   * @returns {Boolean} True if notification should be sent
   */
  shouldSendNotification(sla, currentStatus) {
    const lastNotificationStatus = sla.last_notification_status;
    const currentSLAStatus = currentStatus.status;
    
    // Don't send notifications for safe status
    if (currentSLAStatus === 'safe') {
      return false;
    }
    
    // If this is the first notification and status is warning, critical, or breached
    if (!lastNotificationStatus && ['warning', 'critical', 'breached'].includes(currentSLAStatus)) {
      return true;
    }
    
    // If status has progressed to a more severe level
    const statusProgression = ['safe', 'warning', 'critical', 'breached'];
    const lastIndex = statusProgression.indexOf(lastNotificationStatus);
    const currentIndex = statusProgression.indexOf(currentSLAStatus);
    
    // Send notification if moving to a more severe status
    if (currentIndex > lastIndex) {
      return true;
    }
    
    return false;
  }

  /**
   * Send SLA notification via notification service and WebSocket
   * @param {Object} sla - SLA record
   * @param {Object} statusInfo - Current SLA status information
   */
  async sendSLANotification(sla, statusInfo) {
    try {
      const { status, timeLeft, percentage } = statusInfo;
      
      // Determine notification type and message based on SLA status
      let notificationType = 'info';
      let title = '';
      let message = '';
      
      switch (status) {
        case 'warning':
          notificationType = 'warning';
          title = '⚠️ SLA Warning';
          message = `Ticket ${sla.ticket_id} (${sla.priority}) has reached SLA warning phase - ${percentage}% time elapsed, ${timeLeft} remaining`;
          break;
          
        case 'critical':
          notificationType = 'error'; // Use error for critical to make it more prominent
          title = '🚨 SLA Critical';
          message = `Ticket ${sla.ticket_id} (${sla.priority}) is in SLA critical phase - ${percentage}% time elapsed, ${timeLeft} remaining`;
          break;
          
        case 'breached':
          notificationType = 'error';
          title = '💥 SLA Breached';
          message = `Ticket ${sla.ticket_id} (${sla.priority}) has breached SLA - ${timeLeft}`;
          break;
          
        default:
          return; // Don't send notification for safe status
      }
      
      // Create and broadcast notification using existing service
      await notificationService.createAndBroadcast({
        title,
        message,
        type: notificationType,
        related: {
          ticketMongoId: sla.ticket_mongo_id,
          ticket_id: sla.ticket_id,
          eventType: `sla_${status}`
        },
        metadata: {
          slaStatus: status,
          priority: sla.priority,
          timeLeft: timeLeft,
          percentage: percentage,
          source: 'sla_monitoring'
        }
      });

      // Emit specific SLA WebSocket events for frontend integration
      try {
        const slaEventData = {
          ticketId: sla.ticket_id,
          ticketMongoId: sla.ticket_mongo_id?.toString() || sla._id?.toString(),
          priority: sla.priority,
          status: status,
          timeLeft: timeLeft,
          percentage: percentage,
          message: message,
          timestamp: new Date().toISOString()
        };

        // Emit specific SLA event based on status
        switch (status) {
          case 'warning':
            webSocketService.emitSLAWarning?.(slaEventData) || webSocketService.io?.emit('sla:warning', slaEventData);
            break;
          case 'critical':
            webSocketService.emitSLACritical?.(slaEventData) || webSocketService.io?.emit('sla:critical', slaEventData);
            break;
          case 'breached':
            webSocketService.emitSLABreach?.(slaEventData) || webSocketService.io?.emit('sla:breach', slaEventData);
            break;
        }

        console.log(`📡 Emitted sla:${status} event for ticket ${sla.ticket_id}`);
      } catch (wsError) {
        console.warn('⚠️ Could not emit SLA WebSocket event:', wsError.message);
      }

      // Send email notifications for SLA status changes
      try {
        await this.sendSLAEmailNotification(sla, statusInfo);
      } catch (emailError) {
        console.warn(`⚠️ Could not send SLA email notification for ticket ${sla.ticket_id}:`, emailError.message);
        // Don't throw error - email failure shouldn't stop other notifications
      }
      
      console.log(`📢 SLA notification sent: ${title} - ${message}`);
      
    } catch (error) {
      console.error(`❌ Error sending SLA notification for ticket ${sla.ticket_id}:`, error);
      throw error;
    }
  }

  /**
   * Send SLA email notification
   * @param {Object} sla - SLA record
   * @param {Object} statusInfo - Current SLA status information
   */
  async sendSLAEmailNotification(sla, statusInfo) {
    try {
      const { status, timeLeft, percentage } = statusInfo;
      
      // Send emails for warning, critical, and breached statuses
      if (!['warning', 'critical', 'breached'].includes(status)) {
        return;
      }

      // Get the currently logged-in user (similar to new ticket email logic)
      const User = require('../models/User');
      const users = await User.find({ status: 'active' }).sort({ lastLoginAt: -1 });

      if (!users.length) {
        console.warn('⚠️ No active user found for SLA email notification');
        return;
      }

      // Prepare email data based on SLA status
      let title, description, urgencyLevel;
      
      switch (status) {
        case 'warning':
          title = 'SLA Warning - Ticket Requires Attention';
          description = `This ticket has reached the SLA warning phase and requires immediate attention to prevent SLA breach.`;
          urgencyLevel = 'Warning';
          break;
        case 'critical':
          title = 'SLA Critical - Immediate Action Required';
          description = `This ticket is in the SLA critical phase and requires URGENT attention to avoid SLA breach.`;
          urgencyLevel = 'Critical';
          break;
        case 'breached':
          title = 'SLA BREACHED - Emergency Action Required';
          description = `This ticket has BREACHED its SLA and requires IMMEDIATE emergency action.`;
          urgencyLevel = 'Breached';
          break;
        default:
          title = 'SLA Alert - Ticket Requires Attention';
          description = `This ticket requires attention regarding its SLA status.`;
          urgencyLevel = 'Alert';
      }

      const emailData = {
        ticketId: sla.ticket_id,
        title: title,
        description: description,
        priority: sla.priority,
        assignee: 'System', // Constant value as per user's request
        createdBy: 'ServiceNow', // Constant value
        createdAt: sla.opened_time,
        category: sla.category || 'General',
        timeRemaining: timeLeft,
        percentage: percentage,
        slaHours: this.slaTargets[sla.priority] || 24,
        ticketUrl: `http://localhost:3001/analysis/${sla.ticket_mongo_id}/${sla.ticket_id}`,
        urgencyLevel: urgencyLevel
      };

      // Send email using the SLA breach warning template

      const emailResult = await emailService.sendSLABreachWarningEmailTemplate(emails, emailData);
      
      if (emailResult.success) {
        console.log(`✅ SLA ${status} email sent to ${user.email} for ticket ${sla.ticket_id}`);
      } else {
        console.error(`❌ Failed to send SLA ${status} email for ticket ${sla.ticket_id}:`, emailResult.error);
      }

    } catch (error) {
      console.error(`❌ Error sending SLA email notification for ticket ${sla.ticket_id}:`, error);
      throw error;
    }
  }

n  /**
   * Update SLA record with new notification status
   * @param {Object} sla - SLA record
   * @param {String} newStatus - New notification status
   */
  async updateSLANotificationStatus(sla, newStatus) {
    try {
      await SLA.findByIdAndUpdate(sla._id, {
        last_notification_status: newStatus,
        last_notification_time: new Date()
      });
      
      console.log(`📝 Updated SLA notification status for ticket ${sla.ticket_id}: ${newStatus}`);
      
    } catch (error) {
      console.error(`❌ Error updating SLA notification status for ticket ${sla.ticket_id}:`, error);
      throw error;
    }
  }

  /**
   * Get monitoring service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      monitoringInterval: this.monitoringInterval,
      timezone: this.timezone,
      lastCheck: this.lastCheck || null
    };
  }

  /**
   * Manually trigger SLA check (for testing or immediate execution)
   */
  async triggerManualCheck() {
    console.log('🔧 Manual SLA check triggered');
    await this.performSLACheck();
  }

  /**
   * Get SLA statistics for monitoring
   * @returns {Object} Statistics about SLA monitoring
   */
  async getSLAMonitoringStats() {
    try {
      const stats = await SLA.aggregate([
        {
          $group: {
            _id: '$last_notification_status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const result = {
        total: 0,
        safe: 0,
        warning: 0,
        critical: 0,
        breached: 0,
        unmonitored: 0
      };
      
      stats.forEach(stat => {
        const status = stat._id || 'unmonitored';
        result[status] = stat.count;
        result.total += stat.count;
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error getting SLA monitoring stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const slaMonitoringService = new SLAMonitoringService();

module.exports = {
  SLAMonitoringService,
  slaMonitoringService
};