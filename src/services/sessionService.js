/**
 * Enhanced Session Service for SuperTokens
 * Handles session management, refresh, invalidation, and MongoDB synchronization
 */

const Session = require('supertokens-node/recipe/session');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const UserRoles = require('supertokens-node/recipe/userroles');
const User = require('../models/User');

class SessionService {
  
  /**
   * Create a new session with enhanced data and MongoDB sync
   */
  static async createSession(userId, sessionData = {}) {
    try {
      console.log('🔐 Creating enhanced session for user:', userId);
      
      // Get user data from SuperTokens and MongoDB
      const [metadata, rolesResponse, mongoUser] = await Promise.all([
        UserMetadata.getUserMetadata(userId),
        UserRoles.getRolesForUser("public", userId),
        User.findBySupertokensUserId(userId)
      ]);
      
      const userRoles = rolesResponse.roles || ['admin'];
      const primaryRole = userRoles[0] || 'admin';
      
      // Update MongoDB user last login and add active session
      if (mongoUser) {
        await mongoUser.updateLastLogin();
        
        // Add active session to MongoDB
        if (sessionData.sessionHandle) {
          await mongoUser.addActiveSession({
            sessionHandle: sessionData.sessionHandle,
            userAgent: sessionData.userAgent || 'Unknown',
            ipAddress: sessionData.ipAddress || 'Unknown',
            deviceInfo: sessionData.deviceInfo || 'Unknown'
          });
          console.log('✅ Added active session to MongoDB:', sessionData.sessionHandle);
        }
        
        console.log('✅ Updated MongoDB user last login');
      }
      
      // Create session with comprehensive payload (prioritize MongoDB data)
      const sessionPayload = {
        role: mongoUser?.role || primaryRole,
        roles: mongoUser?.roles || userRoles,
        email: mongoUser?.email || metadata.metadata.email || '',
        name: mongoUser?.name || metadata.metadata.name || '',
        firstName: mongoUser?.firstName || metadata.metadata.first_name || '',
        lastName: mongoUser?.lastName || metadata.metadata.last_name || '',
        phone: mongoUser?.phone || metadata.metadata.phone || '',
        isEmailVerified: mongoUser?.isEmailVerified || metadata.metadata.isEmailVerified || false,
        status: mongoUser?.status || metadata.metadata.status || 'active',
        lastLoginAt: new Date().toISOString(),
        sessionCreatedAt: new Date().toISOString(),
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...sessionData
      };
      
      console.log('✅ Session payload created:', {
        userId,
        role: primaryRole,
        email: metadata.metadata.email,
        sessionId: sessionPayload.sessionId
      });
      
      return sessionPayload;
      
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }
  
  /**
   * Refresh session and update user data
   */
  static async refreshSession(sessionHandle) {
    try {
      if (!sessionHandle) {
        throw new Error('No session handle provided');
      }
      
      console.log('🔄 Refreshing session:', sessionHandle);
      
      // Get session data
      const sessionData = await Session.getSession(sessionHandle);
      if (!sessionData) {
        throw new Error('Session not found');
      }
      
      const userId = sessionData.getUserId();
      
      // Get updated user data
      const [metadata, rolesResponse, mongoUser] = await Promise.all([
        UserMetadata.getUserMetadata(userId),
        UserRoles.getRolesForUser("public", userId),
        User.findBySupertokensUserId(userId)
      ]);
      
      const userRoles = rolesResponse.roles || ['admin'];
      const primaryRole = userRoles[0] || 'admin';
      
      // Update session payload with fresh data
      const updatedPayload = {
        role: primaryRole,
        roles: userRoles,
        email: metadata.metadata.email || '',
        name: metadata.metadata.name || '',
        firstName: metadata.metadata.first_name || '',
        lastName: metadata.metadata.last_name || '',
        phone: metadata.metadata.phone || '',
        isEmailVerified: metadata.metadata.isEmailVerified || false,
        status: metadata.metadata.status || 'active',
        lastRefreshAt: new Date().toISOString(),
        sessionRefreshed: true
      };
      
      // Update session payload
      await sessionData.mergeIntoAccessTokenPayload(updatedPayload);
      
      console.log('✅ Session refreshed successfully:', {
        userId,
        role: primaryRole,
        email: metadata.metadata.email
      });
      
      return {
        success: true,
        sessionData: sessionData,
        userData: {
          userId,
          ...updatedPayload,
          preferences: mongoUser?.preferences || {}
        }
      };
      
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      throw error;
    }
  }
  
  /**
   * Validate session and check user status
   */
  static async validateSession(sessionHandle) {
    try {
      if (!sessionHandle) {
        return {
          valid: false,
          reason: 'No session handle provided'
        };
      }
      
      console.log('🔍 Validating session:', sessionHandle);
      
      // Get session data
      const sessionData = await Session.getSession(sessionHandle);
      if (!sessionData) {
        return {
          valid: false,
          reason: 'Session not found'
        };
      }
      
      const userId = sessionData.getUserId();
      
      // Check if user still exists and is active
      const [metadata, mongoUser] = await Promise.all([
        UserMetadata.getUserMetadata(userId),
        User.findBySupertokensUserId(userId)
      ]);
      
      // Check user status
      if (metadata.metadata.status === 'inactive' || metadata.metadata.status === 'suspended') {
        console.log('❌ User account is inactive or suspended');
        await Session.revokeSession(sessionHandle);
        return {
          valid: false,
          reason: 'Account inactive or suspended'
        };
      }
      
      // Check MongoDB user status
      if (mongoUser && !mongoUser.isActive) {
        console.log('❌ MongoDB user is inactive');
        await Session.revokeSession(sessionHandle);
        return {
          valid: false,
          reason: 'Account deactivated'
        };
      }
      
      console.log('✅ Session validation successful');
      return {
        valid: true,
        sessionData: sessionData,
        userData: {
          userId,
          email: metadata.metadata.email,
          role: metadata.metadata.role,
          status: metadata.metadata.status,
          isEmailVerified: metadata.metadata.isEmailVerified
        }
      };
      
    } catch (error) {
      console.error('❌ Error validating session:', error);
      return {
        valid: false,
        reason: 'Validation error'
      };
    }
  }
  
  /**
   * Revoke session and cleanup
   */
  static async revokeSession(sessionHandle, reason = 'Manual logout') {
    try {
      if (!sessionHandle) {
        throw new Error('No session handle provided');
      }
      
      console.log('🚫 Revoking session:', sessionHandle, 'Reason:', reason);
      
      // Get session data before revoking
      try {
        const sessionData = await Session.getSession(sessionHandle);
        if (sessionData) {
          const userId = sessionData.getUserId();
          
          // Update MongoDB user logout time and remove active session
          const mongoUser = await User.findBySupertokensUserId(userId);
          if (mongoUser) {
            mongoUser.lastLogoutAt = new Date();
            
            // Remove the session from active sessions
            await mongoUser.removeActiveSession(sessionHandle);
            console.log('✅ Removed session from MongoDB active sessions');
            
            await mongoUser.save();
            console.log('✅ Updated MongoDB user logout time');
          }
        }
      } catch (sessionError) {
        console.warn('⚠️ Could not get session data before revocation:', sessionError.message);
        // Continue with revocation even if we can't get session data
      }
      
      // Revoke the session
      await Session.revokeSession(sessionHandle);
      
      console.log('✅ Session revoked successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error revoking session:', error);
      throw error;
    }
  }
  
  /**
   * Revoke all sessions for a user
   */
  static async revokeAllUserSessions(userId, reason = 'Security logout') {
    try {
      console.log('🚫 Revoking all sessions for user:', userId, 'Reason:', reason);
      
      // Get all session handles for user
      const sessionHandles = await Session.getAllSessionHandlesForUser(userId);
      
      if (sessionHandles.length === 0) {
        console.log('ℹ️ No active sessions found for user');
        return { success: true, revokedCount: 0 };
      }
      
      // Revoke all sessions
      const revokePromises = sessionHandles.map(handle => 
        this.revokeSession(handle, reason)
      );
      
      await Promise.all(revokePromises);
      
      // Update MongoDB user logout time
      const mongoUser = await User.findBySupertokensUserId(userId);
      if (mongoUser) {
        mongoUser.lastLogoutAt = new Date();
        await mongoUser.save();
        console.log('✅ Updated MongoDB user logout time');
      }
      
      console.log(`✅ Revoked ${sessionHandles.length} sessions for user`);
      return { 
        success: true, 
        revokedCount: sessionHandles.length 
      };
      
    } catch (error) {
      console.error('❌ Error revoking all user sessions:', error);
      throw error;
    }
  }
  
  /**
   * Get session information
   */
  static async getSessionInfo(sessionHandle) {
    try {
      if (!sessionHandle) {
        return null;
      }
      
      // Use the correct SuperTokens API to get session
      const sessionData = await Session.getSession(sessionHandle);
      if (!sessionData) {
        return null;
      }
      
      const userId = sessionData.getUserId();
      const accessTokenPayload = sessionData.getAccessTokenPayload();
      
      // Get user data
      const [metadata, rolesResponse, mongoUser] = await Promise.all([
        UserMetadata.getUserMetadata(userId),
        UserRoles.getRolesForUser("public", userId),
        User.findBySupertokensUserId(userId)
      ]);
      
      return {
        sessionHandle,
        userId,
        accessTokenPayload,
        userData: {
          email: mongoUser?.email || metadata.metadata.email || '',
          name: mongoUser?.name || metadata.metadata.name || '',
          firstName: mongoUser?.firstName || metadata.metadata.first_name || '',
          lastName: mongoUser?.lastName || metadata.metadata.last_name || '',
          phone: mongoUser?.phone || metadata.metadata.phone || '',
          role: mongoUser?.role || metadata.metadata.role || 'admin',
          roles: mongoUser?.roles || rolesResponse.roles || ['admin'],
          status: mongoUser?.status || metadata.metadata.status || 'active',
          isEmailVerified: mongoUser?.isEmailVerified || metadata.metadata.isEmailVerified || false,
          isActive: mongoUser?.isActive || true,
          lastLoginAt: mongoUser?.lastLoginAt,
          preferences: mongoUser?.preferences || {}
        },
        mongoUser: mongoUser
      };
      
    } catch (error) {
      console.error('❌ Error getting session info:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup expired sessions (utility method)
   */
  static async cleanupExpiredSessions() {
    try {
      console.log('🧹 Starting expired session cleanup...');
      
      // This is a utility method - SuperTokens handles session expiration automatically
      // But we can add custom cleanup logic here if needed
      
      console.log('✅ Session cleanup completed');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error during session cleanup:', error);
      throw error;
    }
  }
  
  /**
   * Get all active sessions for a user
   */
  static async getUserActiveSessions(userId) {
    try {
      const sessionHandles = await Session.getAllSessionHandlesForUser(userId);
      
      const sessionInfos = await Promise.all(
        sessionHandles.map(async (handle) => {
          try {
            return await this.getSessionInfo(handle);
          } catch (error) {
            console.warn(`⚠️ Could not get info for session ${handle}:`, error.message);
            return null;
          }
        })
      );
      
      return sessionInfos.filter(info => info !== null);
      
    } catch (error) {
      console.error('❌ Error getting user active sessions:', error);
      throw error;
    }
  }
}

module.exports = SessionService;
