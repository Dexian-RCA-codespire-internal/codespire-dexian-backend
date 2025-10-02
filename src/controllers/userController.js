// new file servicenow
const { 
  fetchUsersFromDB, 
  getUserStats, 
  getUserById, 
  updateUserStatus, 
  updateUserRoles, 
  addUserRoles,
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
      console.log('🔍 Backend Controller: updateUserStatusController called');
      console.log('   Request params:', req.params);
      console.log('   Request body:', req.body);
      
      const { userId } = req.params;
      const { status } = req.body;

      console.log('🔍 Backend Controller: Extracted data:');
      console.log('   User ID:', userId);
      console.log('   Status:', status);

      if (!userId) {
        console.log('❌ Backend Controller: User ID is missing');
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (!status) {
        console.log('❌ Backend Controller: Status is missing');
        return res.status(400).json({
          success: false,
          error: 'Status is required',
          timestamp: new Date().toISOString()
        });
      }

      console.log('🔄 Backend Controller: Calling updateUserStatus service...');
      const result = await updateUserStatus(userId, status);
      console.log('🔍 Backend Controller: Service result:');
      console.log('   Success:', result.success);
      console.log('   Message:', result.message);
      console.log('   Full result:', result);

      if (result.success) {
        console.log('✅ Backend Controller: User status updated successfully');
        console.log('🔄 Backend Controller: Emitting WebSocket event...');
        
        // Emit WebSocket event for real-time update
        webSocketService.emitUserUpdate(result.data, 'user_updated');
        console.log('✅ Backend Controller: WebSocket event emitted');

        res.json({
          success: true,
          data: result.data,
          message: result.message,
          timestamp: new Date().toISOString()
        });
        console.log('✅ Backend Controller: Response sent successfully');
      } else {
        console.log('❌ Backend Controller: User status update failed');
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Backend Controller: Error in updateUserStatus controller:');
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      console.error('   Full error:', error);
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
      console.log('🔍 updateUserRolesController called');
      console.log('   Request params:', req.params);
      console.log('   Request body:', req.body);
      
      const { userId } = req.params;
      const { roles } = req.body;

      console.log('   Extracted userId:', userId);
      console.log('   Extracted roles:', roles);

      if (!userId) {
        console.log('❌ User ID is missing');
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (!roles || !Array.isArray(roles)) {
        console.log('❌ Roles array is missing or invalid');
        return res.status(400).json({
          success: false,
          error: 'Roles array is required',
          timestamp: new Date().toISOString()
        });
      }

      console.log('🔄 Calling updateUserRoles service...');
      const result = await updateUserRoles(userId, roles);
      console.log('   Service result:', result);

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
      console.log('🔍 createUserController called');
      console.log('   Request body:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { email, password, firstName, lastName, phone, roles } = req.body;
      console.log('   Extracted data:', { email, firstName, lastName, phone, roles });

      console.log('🔄 Calling createUser service...');
      const result = await createUser({
        email,
        password,
        firstName,
        lastName,
        phone,
        roles // Accept roles from frontend
      });
      console.log('   Service result:', result);

      if (result.success) {
        console.log('✅ User created successfully');
        console.log('   OTP Data:', result.otpData);
        console.log('   Message:', result.message);
        
        // Emit WebSocket event for real-time update
        webSocketService.emitUserUpdate(result.data, 'user_created');

        res.status(201).json({
          success: true,
          data: result.data,
          message: result.message,
          otpData: result.otpData, // Include OTP data in response
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('❌ User creation failed:', result.error);
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error in createUser controller:', error);
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

/**
 * Add additional roles to user
 */
async function addUserRolesController(req, res) {
  try {
    console.log('🔍 addUserRolesController called');
    console.log('   Request params:', req.params);
    console.log('   Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { roles } = req.body;

    console.log('   Extracted userId:', userId);
    console.log('   Extracted roles:', roles);

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      console.log('❌ Roles array is missing, invalid, or empty');
      return res.status(400).json({
        success: false,
        error: 'Roles array is required and must not be empty'
      });
    }

    console.log('🔄 Calling addUserRoles service...');
    const result = await addUserRoles(userId, roles);
    console.log('   Service result:', result);

    if (result.success) {
      // Emit WebSocket event for real-time updates
      webSocketService.emitUserUpdate(result.data, 'user_updated');

      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Add user roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = {
  getUsers,
  getUserStatsController,
  getUserByIdController,
  updateUserStatusController,
  updateUserRolesController,
  addUserRolesController,
  deleteUserController,
  createUserController,
  getUserPermissionsController,
  sendUserOTPController,
  verifyUserOTPController,
  resendUserOTPController
};
