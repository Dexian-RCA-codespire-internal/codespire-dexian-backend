const SuperTokensUserService = require('../services/supertokensUserService');
const SessionService = require('../services/sessionService');
const SessionUtils = require('../utils/sessionUtils');
const { requireAdmin, getUserRole } = require('../middleware/roleAuth');

/**
 * Create user (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'admin', status = 'active', useMagicLink = false } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }
    
    // Validate role
    const validRoles = ['user', 'admin', 'moderator', 'support'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Use SuperTokens service to create user
    const result = await SuperTokensUserService.createUser({
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      status,
      useMagicLink
    });
    
    console.log(`✅ User created successfully: ${email} (${result.user.userId})`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        userId: result.user.userId,
        email: result.user.email,
        name: result.user.name,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        phone: result.user.phone,
        role: result.user.role,
        status: result.user.status,
        isEmailVerified: result.user.isEmailVerified,
        verificationMethod: useMagicLink ? 'magic_link' : 'otp'
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: 'Internal server error'
    });
  }
};

/**
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    
    const result = await SuperTokensUserService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      status,
      search
    });
    
    res.json({
      success: true,
      data: {
        users: result.users,
        pagination: result.pagination
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      message: 'Internal server error'
    });
  }
};

/**
 * Get user by ID (Admin only)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Support both MongoDB _id and SuperTokens userId
    let supertokensUserId = userId;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      // If it's a MongoDB ObjectId, find the SuperTokens userId
      const User = require('../models/User');
      const mongoUser = await User.findById(userId);
      if (!mongoUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
      }
      supertokensUserId = mongoUser.supertokensUserId;
    }
    
    const result = await SuperTokensUserService.getUserById(supertokensUserId);
    
    res.json({
      success: true,
      data: result.user
    });
    
  } catch (error) {
    console.error('❌ Error getting user by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: 'Internal server error'
    });
  }
};

/**
 * Update user (Admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, phone, role, status, preferences } = req.body;
    const adminUserId = req.session.getUserId();
    
    // Support both MongoDB _id and SuperTokens userId
    let supertokensUserId = userId;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      const User = require('../models/User');
      const mongoUser = await User.findById(userId);
      if (!mongoUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
      }
      supertokensUserId = mongoUser.supertokensUserId;
    }
    
    // Prevent admin from changing their own role
    if (role && supertokensUserId === adminUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change own role',
        message: 'Admins cannot change their own role'
      });
    }
    
    // Validate role if provided
    if (role) {
      const validRoles = ['user', 'admin', 'moderator', 'support'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role',
          message: `Role must be one of: ${validRoles.join(', ')}`
        });
      }
    }
    
    await SuperTokensUserService.updateUser(supertokensUserId, {
      firstName,
      lastName,
      phone,
      role,
      status,
      preferences
    });
    
    console.log(`✅ Admin ${adminUserId} updated user ${supertokensUserId}`);
    
    // Get updated user data
    const result = await SuperTokensUserService.getUserById(supertokensUserId);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.user
    });
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: 'Internal server error'
    });
  }
};

/**
 * Delete user (Admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.session.getUserId();
    
    // Support both MongoDB _id and SuperTokens userId
    let supertokensUserId = userId;
    let userEmail = '';
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      const User = require('../models/User');
      const mongoUser = await User.findById(userId);
      if (!mongoUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
      }
      supertokensUserId = mongoUser.supertokensUserId;
    }
    
    // Get user data before deletion
    const userResult = await SuperTokensUserService.getUserById(supertokensUserId);
    userEmail = userResult.user.email;
    
    // Prevent admin from deleting themselves
    if (supertokensUserId === adminUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete own account',
        message: 'Admins cannot delete their own account'
      });
    }
    
    await SuperTokensUserService.deleteUser(supertokensUserId);
    
    console.log(`✅ Admin ${adminUserId} deleted user: ${userEmail} (${supertokensUserId})`);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUserId: supertokensUserId,
        deletedUserMongoId: userId,
        deletedUserEmail: userEmail,
        deletedBy: adminUserId,
        deletedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: 'Internal server error'
    });
  }
};

/**
 * Verify current session and get user info
 * Enhanced to properly handle session revocation detection
 */
const verifySession = async (req, res) => {
  try {
    console.log('🔍 [DEBUG] verifySession called');
    
    // Use centralized session validation
    const validation = await SessionUtils.validateSessionAndGetUser(req.session);
    
    if (!validation.valid) {
      console.log('❌ [DEBUG] Session validation failed:', validation.reason);
      return res.status(401).json({
        success: false,
        error: validation.reason,
        message: 'Session has been revoked or expired',
        sessionRevoked: validation.sessionRevoked || false
      });
    }
    
    console.log('✅ [DEBUG] Session verified successfully:', {
      sessionHandle: validation.sessionInfo.sessionHandle,
      userId: validation.sessionInfo.userId,
      userEmail: validation.user.email
    });
    
    res.json({
      success: true,
      data: {
        userId: validation.sessionInfo.userId,
        sessionHandle: validation.sessionInfo.sessionHandle,
        isValid: true,
        accessTokenPayload: validation.accessTokenPayload,
        user: validation.user,
        sessionInfo: validation.sessionInfo
      }
    });
  } catch (error) {
    console.error('❌ Error verifying session:', error);
    
    // If it's a session-related error, return 401
    if (error.message.includes('session') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        error: 'Session validation failed',
        message: 'Session has been revoked or expired',
        sessionRevoked: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Session verification failed',
      message: 'Unable to verify session'
    });
  }
};

/**
 * Check session status - lightweight endpoint for frontend session validation
 * Returns 200 if session is valid, 401 if session is revoked/expired
 */
const checkSessionStatus = async (req, res) => {
  try {
    console.log('🔍 [DEBUG] checkSessionStatus called');
    
    // Use centralized session status check
    const status = await SessionUtils.checkSessionStatus(req.session);
    
    if (!status.valid) {
      console.log('❌ [DEBUG] Session status check failed:', status.reason);
      return res.status(401).json({
        success: false,
        error: status.reason,
        message: 'Session has been revoked or expired',
        sessionRevoked: status.sessionRevoked || false
      });
    }
    
    // Session is valid
    console.log('✅ [DEBUG] Session status check successful:', {
      sessionHandle: status.sessionInfo.sessionHandle,
      userId: status.sessionInfo.userId
    });
    
    res.json({
      success: true,
      data: {
        isValid: true,
        sessionHandle: status.sessionInfo.sessionHandle,
        userId: status.sessionInfo.userId,
        sessionInfo: {
          timeCreated: status.sessionInfo.timeCreated,
          expiry: status.sessionInfo.expiry
        }
      }
    });
  } catch (error) {
    console.error('❌ Error checking session status:', error);
    
    // If it's a session-related error, return 401
    if (error.message.includes('session') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        error: 'Session validation failed',
        message: 'Session has been revoked or expired',
        sessionRevoked: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to check session status',
      message: 'Internal server error'
    });
  }
};

/**
 * Get user profile (for current user)
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    const result = await SuperTokensUserService.getUserById(userId);
    
    res.json({
      success: true,
      data: result.user
    });
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      message: 'Internal server error'
    });
  }
};

/**
 * Update user role (Admin only) - Legacy endpoint
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    await SuperTokensUserService.updateUser(userId, { role });
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
      message: 'Internal server error'
    });
  }
};

/**
 * Revoke user session by session handle (Admin only)
 */
const revokeUserSession = async (req, res) => {
  try {
    const { sessionHandle } = req.params;
    const adminUserId = req.session.getUserId();
    
    if (!sessionHandle) {
      return res.status(400).json({
        success: false,
        error: 'Session handle required',
        message: 'Session handle is required to revoke a session'
      });
    }
    
    // Use Session.revokeSession directly instead of going through SessionService
    const Session = require('supertokens-node/recipe/session');
    const revoked = await Session.revokeSession(sessionHandle);
    
    console.log(`✅ Admin ${adminUserId} revoked session:`, sessionHandle);
    
    res.json({
      success: true,
      message: 'Session revoked successfully',
      data: {
        revokedSessionHandle: sessionHandle,
        revokedBy: adminUserId,
        revokedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error revoking session:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to revoke session',
      message: 'Session may not exist or may already be revoked'
    });
  }
};

/**
 * Get user active sessions (Admin only)
 */
const getUserActiveSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.session.getUserId();
    
    // Support both MongoDB _id and SuperTokens userId
    let supertokensUserId = userId;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      const User = require('../models/User');
      const mongoUser = await User.findById(userId);
      if (!mongoUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
      }
      supertokensUserId = mongoUser.supertokensUserId;
    }
    
    // Use Session.getAllSessionHandlesForUser directly
    const Session = require('supertokens-node/recipe/session');
    const sessionHandles = await Session.getAllSessionHandlesForUser(supertokensUserId);
    
    // Get session information for each handle
    const activeSessions = [];
    for (const handle of sessionHandles) {
      try {
        const sessionInfo = await Session.getSessionInformation(handle);
        if (sessionInfo) {
          activeSessions.push({
            sessionHandle: handle,
            userId: sessionInfo.userId,
            timeCreated: sessionInfo.timeCreated,
            expiry: sessionInfo.expiry,
            sessionDataInDatabase: sessionInfo.sessionDataInDatabase
          });
        }
      } catch (err) {
        console.warn(`⚠️ Could not get info for session ${handle}:`, err.message);
      }
    }
    
    console.log(`✅ Admin ${adminUserId} retrieved sessions for user ${supertokensUserId}`);
    
    res.json({
      success: true,
      data: {
        userId: supertokensUserId,
        activeSessions: activeSessions,
        sessionCount: activeSessions.length,
        retrievedBy: adminUserId,
        retrievedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting user active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user sessions',
      message: 'Internal server error'
    });
  }
};

/**
 * Revoke all user sessions (Admin only)
 */
const revokeAllUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.session.getUserId();
    
    // Support both MongoDB _id and SuperTokens userId
    let supertokensUserId = userId;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      const User = require('../models/User');
      const mongoUser = await User.findById(userId);
      if (!mongoUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
      }
      supertokensUserId = mongoUser.supertokensUserId;
    }
    
    // Prevent admin from revoking their own sessions
    if (supertokensUserId === adminUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot revoke own sessions',
        message: 'Admins cannot revoke their own sessions'
      });
    }
    
    // Use Session.revokeAllSessionsForUser directly
    const Session = require('supertokens-node/recipe/session');
    const revokedSessions = await Session.revokeAllSessionsForUser(supertokensUserId);
    
    console.log(`✅ Admin ${adminUserId} revoked all sessions for user ${supertokensUserId}`);
    
    res.json({
      success: true,
      message: 'All user sessions revoked successfully',
      data: {
        userId: supertokensUserId,
        revokedSessionsCount: revokedSessions.length,
        revokedBy: adminUserId,
        revokedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error revoking all user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke user sessions',
      message: 'Internal server error'
    });
  }
};

/**
 * Refresh current user session
 */
const refreshUserSession = async (req, res) => {
  try {
    // Session is already available on req after middleware
    const sessionHandle = req.session.getHandle();
    const userId = req.session.getUserId();
    
    console.log(`🔄 Refreshing session for user ${userId}, handle: ${sessionHandle}`);
    
    // Get user data from MongoDB
    const User = require('../models/User');
    const mongoUser = await User.findBySupertokensUserId(userId);
    
    if (!mongoUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found in database'
      });
    }
    
    // Try to get session information (optional)
    let sessionInfo = null;
    try {
      const Session = require('supertokens-node/recipe/session');
      sessionInfo = await Session.getSessionInformation(sessionHandle);
    } catch (sessionError) {
      console.warn('⚠️ Could not get session information:', sessionError.message);
      // Continue without session info - the session is still valid
    }
    
    console.log(`✅ Session refreshed for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        userId: userId,
        sessionHandle: sessionHandle,
        refreshedAt: new Date().toISOString(),
        sessionInfo: sessionInfo ? {
          timeCreated: sessionInfo.timeCreated,
          expiry: sessionInfo.expiry
        } : null,
        userData: {
          email: mongoUser.email,
          name: mongoUser.name,
          firstName: mongoUser.firstName,
          lastName: mongoUser.lastName,
          phone: mongoUser.phone,
          role: mongoUser.role,
          roles: mongoUser.roles,
          status: mongoUser.status,
          isEmailVerified: mongoUser.isEmailVerified,
          isActive: mongoUser.isActive,
          lastLoginAt: mongoUser.lastLoginAt,
          preferences: mongoUser.preferences
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error refreshing session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh session',
      message: 'Internal server error'
    });
  }
};

/**
 * Get current user session info
 */
const getCurrentSessionInfo = async (req, res) => {
  try {
    console.log('🔍 [DEBUG] getCurrentSessionInfo called:', {
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    // Use centralized session validation
    const validation = await SessionUtils.validateSessionAndGetUser(req.session);
    
    if (!validation.valid) {
      console.log('❌ [DEBUG] Session validation failed:', validation.reason);
      return res.status(401).json({
        success: false,
        error: validation.reason,
        message: 'Session has been revoked or expired',
        sessionRevoked: validation.sessionRevoked || false
      });
    }
    
    // Create session info response
    const sessionInfo = {
      session: {
        sessionHandle: validation.sessionInfo.sessionHandle,
        userId: validation.sessionInfo.userId,
        accessTokenPayload: validation.accessTokenPayload
      },
      user: validation.user,
      sessionInfo: validation.sessionInfo
    };
    
    res.json({
      success: true,
      data: sessionInfo
    });
    
  } catch (error) {
    console.error('❌ Error getting session info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session info',
      message: 'Internal server error'
    });
  }
};

// /**
//  * Get current user's active sessions from MongoDB
//  */
const getCurrentUserActiveSessions = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    
    // Get user from MongoDB
    const User = require('../models/User');
    const mongoUser = await User.findBySupertokensUserId(userId);
    
    if (!mongoUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found in database'
      });
    }
    
    // Get SuperTokens sessions for comparison
    const Session = require('supertokens-node/recipe/session');
    const superTokensSessions = await Session.getAllSessionHandlesForUser(userId);
    
    res.json({
      success: true,
      data: {
        mongoActiveSessions: mongoUser.activeSessions,
        superTokensSessions: superTokensSessions,
        sessionCount: {
          mongo: mongoUser.activeSessions.length,
          superTokens: superTokensSessions.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting current user active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions',
      message: 'Internal server error'
    });
  }
};

/**
 * Manually sync user sessions between SuperTokens and MongoDB
 */
const syncUserSessions = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    
    // Use SessionUtils to sync sessions
    const result = await SessionUtils.syncUserSessions(userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Sessions synced successfully',
        data: {
          userId: userId,
          syncedAt: new Date().toISOString(),
          syncResult: result
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Session sync failed',
        message: result.reason || result.error || 'Failed to sync sessions'
      });
    }
    
  } catch (error) {
    console.error('❌ Error syncing user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync sessions',
      message: 'Internal server error'
    });
  }
};

/**
 * Clean up invalid sessions for current user
 */
const cleanupUserSessions = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    
    // Use SessionUtils to cleanup invalid sessions
    const result = await SessionUtils.cleanupAllInvalidSessions(userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Session cleanup completed successfully',
        data: {
          userId: userId,
          cleanedAt: new Date().toISOString(),
          cleanupResult: result
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Session cleanup failed',
        message: result.reason || result.error || 'Failed to cleanup sessions'
      });
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup sessions',
      message: 'Internal server error'
    });
  }
};

/**
 * Force logout - revoke all sessions and clear all data
 */
const forceLogout = async (req, res) => {
  try {
    console.log('🚪 Force logout initiated');
    
    // Get session info if available
    let sessionHandle = null;
    let userId = null;
    
    try {
      if (req.session) {
        sessionHandle = req.session.getHandle();
        userId = req.session.getUserId();
        console.log(`🚪 Force logout for user ${userId}, session: ${sessionHandle}`);
      }
    } catch (sessionError) {
      console.log('⚠️ No valid session found for force logout');
    }
    
    // Revoke all sessions for this user if we have userId
    if (userId) {
      try {
        const Session = require('supertokens-node/recipe/session');
        const existingSessions = await Session.getAllSessionHandlesForUser(userId);
        
        if (existingSessions && existingSessions.length > 0) {
          console.log(`🚫 Revoking ${existingSessions.length} sessions for user ${userId}`);
          for (const handle of existingSessions) {
            try {
              await Session.revokeSession(handle);
              console.log(`✅ Revoked session: ${handle}`);
            } catch (revokeError) {
              console.warn(`⚠️ Could not revoke session ${handle}:`, revokeError.message);
            }
          }
        }
      } catch (revokeError) {
        console.warn('⚠️ Error revoking user sessions:', revokeError.message);
      }
    }
    
    // Clean up MongoDB sessions
    if (userId) {
      try {
        const User = require('../models/User');
        await User.updateOne(
          { supertokensUserId: userId },
          { $unset: { activeSessions: 1 } }
        );
        console.log(`✅ Cleaned up MongoDB sessions for user ${userId}`);
      } catch (mongoError) {
        console.warn('⚠️ Error cleaning up MongoDB sessions:', mongoError.message);
      }
    }
    
    console.log('✅ Force logout completed');
    
    res.json({
      success: true,
      message: 'Force logout completed successfully',
      sessionsRevoked: userId ? true : false
    });
    
  } catch (error) {
    console.error('❌ Error during force logout:', error);
    res.status(500).json({
      success: false,
      error: 'Force logout failed',
      message: 'Internal server error during logout'
    });
  }
};

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  updateUserRole,
  getUserProfile,
  getAllUsers,
  verifySession,
  checkSessionStatus,
  revokeUserSession,
  getUserActiveSessions,
  revokeAllUserSessions,
  refreshUserSession,
  forceLogout,
  getCurrentSessionInfo,
  getCurrentUserActiveSessions,
  syncUserSessions,
  cleanupUserSessions
};