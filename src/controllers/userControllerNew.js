const SuperTokensUserService = require('../services/supertokensUserService');
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
 */
const verifySession = async (req, res) => {
  try {
    const result = await SuperTokensUserService.verifySessionAndGetUser(req.session);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error verifying session:', error);
    res.status(500).json({
      success: false,
      error: 'Session verification failed',
      message: 'Unable to verify session'
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
    
    if (!sessionHandle) {
      return res.status(400).json({
        success: false,
        error: 'Session handle required',
        message: 'Session handle is required to revoke a session'
      });
    }
    
    const Session = require('supertokens-node/recipe/session');
    await Session.revokeSession(sessionHandle);
    console.log('✅ Session revoked:', sessionHandle);
    
    res.json({
      success: true,
      message: 'Session revoked successfully',
      data: {
        revokedSessionHandle: sessionHandle,
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

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  updateUserRole,
  getUserProfile,
  getAllUsers,
  verifySession,
  revokeUserSession
};
