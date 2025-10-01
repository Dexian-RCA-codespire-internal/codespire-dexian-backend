// new file servicenow
const { 
  fetchUsersFromDB, 
  getUserStats, 
  getUserById, 
  updateUserStatus, 
  updateUserRoles, 
  deleteUser, 
  createUser 
} = require('../services/userService');
const { webSocketService } = require('../services/websocketService');
const { validationResult } = require('express-validator');
const SuperTokensOTPService = require('../services/supertokensOTPService');

/**
 * Get paginated users with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        query = '',
        role = '',
        status = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const result = await fetchUsersFromDB({
        page: parseInt(page),
        limit: parseInt(limit),
        query,
        role,
        status,
        sortBy,
        sortOrder
      });

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          pagination: result.pagination,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in getUsers controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
}

/**
 * Get user statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserStatsController(req, res) {
    try {
      const { role = '', status = '' } = req.query;

      const result = await getUserStats({
        role,
        status
      });

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in getUserStats controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
}

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserByIdController(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const result = await getUserById(userId);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in getUserById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
}

/**
 * Update user status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateUserStatusController(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required',
          timestamp: new Date().toISOString()
        });
      }

      const result = await updateUserStatus(userId, status);

      if (result.success) {
        // Emit WebSocket event for real-time update
        webSocketService.emitUserUpdate(result.data, 'user_updated');

        res.json({
          success: true,
          data: result.data,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in updateUserStatus controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
}

/**
 * Update user roles
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateUserRolesController(req, res) {
    try {
      const { userId } = req.params;
      const { roles } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (!roles || !Array.isArray(roles)) {
        return res.status(400).json({
          success: false,
          error: 'Roles array is required',
          timestamp: new Date().toISOString()
        });
      }

      const result = await updateUserRoles(userId, roles);

      if (result.success) {
        // Emit WebSocket event for real-time update
        webSocketService.emitUserUpdate(result.data, 'user_updated');

        res.json({
          success: true,
          data: result.data,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in updateUserRoles controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
}

/**
 * Delete user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteUserController(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const result = await deleteUser(userId);

      if (result.success) {
        // Emit WebSocket event for real-time update
        webSocketService.emitUserUpdate({ _id: userId }, 'user_deleted');

        res.json({
          success: true,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in deleteUser controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
}

/**
 * Create new user (following registration flow)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createUserController(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { email, password, firstName, lastName, phone, roles } = req.body;

      const result = await createUser({
        email,
        password,
        firstName,
        lastName,
        phone,
        roles // Accept roles from frontend
      });

      if (result.success) {
        // Emit WebSocket event for real-time update
        webSocketService.emitUserUpdate(result.data, 'user_created');

        res.status(201).json({
          success: true,
          data: result.data,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in createUser controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
}

/**
 * Get user permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserPermissionsController(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const result = await getUserById(userId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            userId: result.data._id,
            roles: result.data.roles,
            permissions: result.data.permissions
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in getUserPermissions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
}

/**
 * Send OTP to user email for verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function sendUserOTPController(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Use SuperTokensOTPService to send OTP
    const result = await SuperTokensOTPService.sendOTP(email);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deviceId: result.deviceId,
        preAuthSessionId: result.preAuthSessionId
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Verify OTP code for user email verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function verifyUserOTPController(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp, deviceId, preAuthSessionId } = req.body;

    // Use SuperTokensOTPService to verify OTP
    const result = await SuperTokensOTPService.verifyOTP(email, otp, deviceId, preAuthSessionId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        user: result.user
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Resend OTP code to user email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function resendUserOTPController(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, deviceId, preAuthSessionId } = req.body;

    // Use SuperTokensOTPService to resend OTP
    const result = await SuperTokensOTPService.resendOTP(email, deviceId, preAuthSessionId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deviceId: result.deviceId,
        preAuthSessionId: result.preAuthSessionId
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

module.exports = {
  getUsers,
  getUserStatsController,
  getUserByIdController,
  updateUserStatusController,
  updateUserRolesController,
  deleteUserController,
  createUserController,
  getUserPermissionsController,
  sendUserOTPController,
  verifyUserOTPController,
  resendUserOTPController
};
