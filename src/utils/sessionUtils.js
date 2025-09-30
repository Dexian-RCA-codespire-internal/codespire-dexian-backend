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
   * Validate session and get comprehensive user data
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
      return {
        valid: false,
        reason: 'Session validation failed',
        error: error.message
      };
    }
  }
  
  /**
   * Lightweight session status check
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
      return {
        valid: false,
        reason: 'Session validation failed',
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
}

module.exports = SessionUtils;

