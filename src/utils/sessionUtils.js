/**
 * Centralized Session Utilities
 * Consolidates all session-related operations to avoid duplication
 */

const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const UserRoles = require('supertokens-node/recipe/userroles');
const User = require('../models/User');

class SessionUtils {
  /**
   * Validate session and get comprehensive user data with automatic cleanup
   * @param {Object} session - SuperTokens session object
   * @returns {Object} - Validation result with user data
   */
  static async validateSessionAndGetUser(session) {
    try {
      const sessionHandle = session.getHandle();
      const userId = session.getUserId();
      
      // Check if session still exists in SuperTokens
      const sessionInfo = await Session.getSessionInformation(sessionHandle);
      if (!sessionInfo) {
        // Session not found in SuperTokens - clean up MongoDB
        console.log('🧹 Session not found in SuperTokens during validation, cleaning up MongoDB:', sessionHandle);
        await this.cleanupInvalidSessionFromMongoDB(userId, sessionHandle);
        
        return {
          valid: false,
          reason: 'Session not found in SuperTokens',
          sessionRevoked: true
        };
      }
      
      // Get user data from MongoDB
      const mongoUser = await User.findBySupertokensUserId(userId);
      if (!mongoUser) {
        return {
          valid: false,
          reason: 'User not found in database',
          sessionRevoked: true
        };
      }
      
      if (!mongoUser.isActive) {
        return {
          valid: false,
          reason: 'User account is inactive',
          sessionRevoked: true
        };
      }
      
      // Perform automatic session cleanup for this user (background task)
      // This ensures MongoDB stays in sync with SuperTokens
      this.cleanupAllInvalidSessions(userId).catch(error => {
        console.warn('⚠️ Background session cleanup failed:', error.message);
      });
      
      // Get user metadata and roles
      const [metadata, rolesResponse] = await Promise.all([
        UserMetadata.getUserMetadata(userId),
        UserRoles.getRolesForUser("public", userId)
      ]);
      
      const userRoles = rolesResponse.roles || ['admin'];
      const accessTokenPayload = session.getAccessTokenPayload();
      
      return {
        valid: true,
        sessionInfo: {
          sessionHandle,
          userId,
          timeCreated: sessionInfo.timeCreated,
          expiry: sessionInfo.expiry,
          sessionDataInDatabase: sessionInfo.sessionDataInDatabase
        },
        user: {
          id: userId,
          email: mongoUser.email || metadata.metadata.email || '',
          name: mongoUser.name || metadata.metadata.name || '',
          firstName: mongoUser.firstName || metadata.metadata.first_name || '',
          lastName: mongoUser.lastName || metadata.metadata.last_name || '',
          phone: mongoUser.phone || metadata.metadata.phone || '',
          role: mongoUser.role || metadata.metadata.role || 'admin',
          roles: mongoUser.roles || userRoles,
          status: mongoUser.status || metadata.metadata.status || 'active',
          isEmailVerified: mongoUser.isEmailVerified || metadata.metadata.isEmailVerified || false,
          isActive: mongoUser.isActive !== false,
          lastLoginAt: mongoUser.lastLoginAt,
          preferences: mongoUser.preferences || {}
        },
        accessTokenPayload
      };
    } catch (error) {
      console.error('❌ Error validating session:', error);
      
      // If we can't validate the session, clean up from MongoDB to be safe
      try {
        const sessionHandle = session.getHandle();
        const userId = session.getUserId();
        await this.cleanupInvalidSessionFromMongoDB(userId, sessionHandle);
      } catch (cleanupError) {
        console.warn('⚠️ Could not cleanup session from MongoDB during validation error:', cleanupError.message);
      }
      
      return {
        valid: false,
        reason: 'Session validation failed',
        sessionRevoked: true,
        error: error.message
      };
    }
  }
  
  /**
   * Lightweight session status check with MongoDB cleanup
   * @param {Object} session - SuperTokens session object
   * @returns {Object} - Session status result
   */
  static async checkSessionStatus(session) {
    try {
      const sessionHandle = session.getHandle();
      const userId = session.getUserId();
      
      // Check if session still exists in SuperTokens
      const sessionInfo = await Session.getSessionInformation(sessionHandle);
      if (!sessionInfo) {
        // Session not found in SuperTokens - clean up MongoDB
        console.log('🧹 Session not found in SuperTokens, cleaning up MongoDB:', sessionHandle);
        await this.cleanupInvalidSessionFromMongoDB(userId, sessionHandle);
        
        return {
          valid: false,
          reason: 'Session not found in SuperTokens',
          sessionRevoked: true
        };
      }
      
      return {
        valid: true,
        sessionInfo: {
          sessionHandle,
          userId,
          timeCreated: sessionInfo.timeCreated,
          expiry: sessionInfo.expiry
        }
      };
    } catch (error) {
      console.error('❌ Error checking session status:', error);
      
      // If we can't check the session, clean up from MongoDB to be safe
      try {
        const sessionHandle = session.getHandle();
        const userId = session.getUserId();
        await this.cleanupInvalidSessionFromMongoDB(userId, sessionHandle);
      } catch (cleanupError) {
        console.warn('⚠️ Could not cleanup session from MongoDB:', cleanupError.message);
      }
      
      return {
        valid: false,
        reason: 'Session validation failed',
        sessionRevoked: true, // Assume session is revoked if we can't check it
        error: error.message
      };
    }
  }
  
  /**
   * Update session activity in MongoDB
   * @param {string} userId - SuperTokens user ID
   * @param {string} sessionHandle - Session handle
   */
  static async updateSessionActivity(userId, sessionHandle) {
    try {
      const mongoUser = await User.findBySupertokensUserId(userId);
      if (mongoUser) {
        await mongoUser.updateSessionActivity(sessionHandle);
      }
    } catch (error) {
      console.warn('⚠️ Could not update session activity:', error.message);
    }
  }

  /**
   * Clean up invalid session from MongoDB
   * @param {string} userId - SuperTokens user ID
   * @param {string} sessionHandle - Session handle to remove
   */
  static async cleanupInvalidSessionFromMongoDB(userId, sessionHandle) {
    try {
      const mongoUser = await User.findBySupertokensUserId(userId);
      if (mongoUser) {
        const beforeCount = mongoUser.activeSessions.length;
        await mongoUser.removeActiveSession(sessionHandle);
        const afterCount = mongoUser.activeSessions.length;
        
        if (beforeCount > afterCount) {
          console.log(`✅ Cleaned up invalid session from MongoDB: ${sessionHandle} (${beforeCount} -> ${afterCount} sessions)`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not cleanup session from MongoDB:', error.message);
    }
  }

  /**
   * Sync all sessions between SuperTokens and MongoDB for a user
   * @param {string} userId - SuperTokens user ID
   * @returns {Object} - Sync result
   */
  static async syncUserSessions(userId) {
    try {
      console.log(`🔄 Syncing sessions for user: ${userId}`);
      
      // Get sessions from SuperTokens
      const superTokensSessions = await Session.getAllSessionHandlesForUser(userId);
      const superTokensHandles = new Set(superTokensSessions);
      
      // Get user from MongoDB
      const mongoUser = await User.findBySupertokensUserId(userId);
      if (!mongoUser) {
        console.log('⚠️ User not found in MongoDB, skipping sync');
        return { success: false, reason: 'User not found in MongoDB' };
      }
      
      const mongoSessions = mongoUser.activeSessions || [];
      const mongoHandles = new Set(mongoSessions.map(s => s.sessionHandle));
      
      // Find sessions that exist in MongoDB but not in SuperTokens (should be removed)
      const sessionsToRemove = [...mongoHandles].filter(handle => !superTokensHandles.has(handle));
      
      // Find sessions that exist in SuperTokens but not in MongoDB (should be added)
      const sessionsToAdd = [...superTokensHandles].filter(handle => !mongoHandles.has(handle));
      
      let removedCount = 0;
      let addedCount = 0;
      
      // Remove invalid sessions from MongoDB
      for (const sessionHandle of sessionsToRemove) {
        try {
          await mongoUser.removeActiveSession(sessionHandle);
          removedCount++;
          console.log(`🧹 Removed invalid session from MongoDB: ${sessionHandle}`);
        } catch (error) {
          console.warn(`⚠️ Could not remove session ${sessionHandle}:`, error.message);
        }
      }
      
      // Add missing sessions to MongoDB (with basic info)
      for (const sessionHandle of sessionsToAdd) {
        try {
          await mongoUser.addActiveSession({
            sessionHandle,
            userAgent: 'Synced from SuperTokens',
            ipAddress: 'Unknown',
            deviceInfo: 'Unknown'
          });
          addedCount++;
          console.log(`➕ Added missing session to MongoDB: ${sessionHandle}`);
        } catch (error) {
          console.warn(`⚠️ Could not add session ${sessionHandle}:`, error.message);
        }
      }
      
      const result = {
        success: true,
        superTokensSessions: superTokensSessions.length,
        mongoSessionsBefore: mongoSessions.length,
        mongoSessionsAfter: mongoUser.activeSessions.length,
        removedCount,
        addedCount,
        synced: removedCount > 0 || addedCount > 0
      };
      
      if (result.synced) {
        console.log(`✅ Session sync completed for user ${userId}:`, result);
      } else {
        console.log(`✅ Sessions already in sync for user ${userId}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error syncing user sessions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up all invalid sessions for a user
   * @param {string} userId - SuperTokens user ID
   * @returns {Object} - Cleanup result
   */
  static async cleanupAllInvalidSessions(userId) {
    try {
      console.log(`🧹 Cleaning up all invalid sessions for user: ${userId}`);
      
      const mongoUser = await User.findBySupertokensUserId(userId);
      if (!mongoUser) {
        return { success: false, reason: 'User not found in MongoDB' };
      }
      
      const mongoSessions = mongoUser.activeSessions || [];
      let removedCount = 0;
      
      // Check each MongoDB session against SuperTokens
      for (const mongoSession of mongoSessions) {
        try {
          const sessionInfo = await Session.getSessionInformation(mongoSession.sessionHandle);
          if (!sessionInfo) {
            // Session doesn't exist in SuperTokens, remove from MongoDB
            await mongoUser.removeActiveSession(mongoSession.sessionHandle);
            removedCount++;
            console.log(`🧹 Removed invalid session: ${mongoSession.sessionHandle}`);
          }
        } catch (error) {
          // If we can't check the session, assume it's invalid and remove it
          await mongoUser.removeActiveSession(mongoSession.sessionHandle);
          removedCount++;
          console.log(`🧹 Removed unverifiable session: ${mongoSession.sessionHandle}`);
        }
      }
      
      const result = {
        success: true,
        removedCount,
        remainingSessions: mongoUser.activeSessions.length
      };
      
      console.log(`✅ Session cleanup completed for user ${userId}:`, result);
      return result;
      
    } catch (error) {
      console.error('❌ Error cleaning up sessions:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SessionUtils;

