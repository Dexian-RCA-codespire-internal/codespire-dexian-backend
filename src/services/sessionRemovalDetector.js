/**
 * Session Removal Detection Service
 * Monitors for session removal and updates MongoDB accordingly
 */

const Session = require('supertokens-node/recipe/session');
const User = require('../models/User');

class SessionRemovalDetector {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.checkInterval = 5000; // Check every 5 seconds
    this.lastSessionCounts = new Map(); // Track session counts per user
  }

  /**
   * Start monitoring for session removal
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Session removal detection already active');
      return;
    }

    console.log('🔍 Starting session removal detection...');
    this.isMonitoring = true;

    // Check for session removal every 5 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.checkForSessionRemoval();
    }, this.checkInterval);

    console.log('✅ Session removal detection started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping session removal detection...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('✅ Session removal detection stopped');
  }

  /**
   * Check for session removal by comparing current vs previous session counts
   */
  async checkForSessionRemoval() {
    try {
      // Get all users from MongoDB
      const users = await User.find({ isActive: true });
      
      for (const user of users) {
        try {
          // Get current SuperTokens sessions for this user
          const currentSessions = await Session.getAllSessionHandlesForUser(user.supertokensUserId);
          const currentCount = currentSessions.length;
          
          // Get previous count
          const previousCount = this.lastSessionCounts.get(user.supertokensUserId) || 0;
          
          // If session count decreased, sessions were removed
          if (currentCount < previousCount) {
            console.log(`🚫 Detected session removal for user ${user.email}: ${previousCount} -> ${currentCount}`);
            
            // Update MongoDB active sessions to match SuperTokens
            await this.syncActiveSessions(user, currentSessions);
          }
          
          // Update the count
          this.lastSessionCounts.set(user.supertokensUserId, currentCount);
          
        } catch (userError) {
          console.warn(`⚠️ Error checking sessions for user ${user.email}:`, userError.message);
        }
      }
    } catch (error) {
      console.error('❌ Error in session removal detection:', error);
    }
  }

  /**
   * Sync MongoDB active sessions with SuperTokens sessions
   */
  async syncActiveSessions(user, superTokensSessions) {
    try {
      // Get current MongoDB active sessions
      const mongoSessions = user.activeSessions || [];
      
      // Create a set of SuperTokens session handles for quick lookup
      const superTokensHandles = new Set(superTokensSessions);
      
      // Filter out sessions that no longer exist in SuperTokens
      const validSessions = mongoSessions.filter(session => 
        superTokensHandles.has(session.sessionHandle)
      );
      
      // If there are differences, update MongoDB
      if (validSessions.length !== mongoSessions.length) {
        user.activeSessions = validSessions;
        await user.save();
        
        console.log(`✅ Synced active sessions for user ${user.email}: ${mongoSessions.length} -> ${validSessions.length}`);
      }
      
    } catch (error) {
      console.error(`❌ Error syncing sessions for user ${user.email}:`, error);
    }
  }

  /**
   * Manually sync sessions for a specific user
   */
  async syncUserSessions(userId) {
    try {
      const user = await User.findBySupertokensUserId(userId);
      if (!user) {
        console.log('⚠️ User not found for session sync:', userId);
        return;
      }

      const superTokensSessions = await Session.getAllSessionHandlesForUser(userId);
      await this.syncActiveSessions(user, superTokensSessions);
      
      console.log(`✅ Manually synced sessions for user ${user.email}`);
    } catch (error) {
      console.error('❌ Error in manual session sync:', error);
    }
  }
}

// Create singleton instance
const sessionRemovalDetector = new SessionRemovalDetector();

module.exports = sessionRemovalDetector;
