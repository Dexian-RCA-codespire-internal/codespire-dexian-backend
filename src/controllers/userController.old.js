const SuperTokensUserService = require('../services/supertokensUserService');
const User = require('../models/User'); // Keep for migration period
const { requireAdmin, getUserRole } = require('../middleware/roleAuth');

/**
 * Update user role (Admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminUserId = req.session.getUserId();
    
    // Validate role
    const validRoles = ['user', 'admin', 'moderator', 'support'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Find user in database - support both MongoDB _id and SuperTokens userId
    let user;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      // If it's a MongoDB ObjectId, find by _id
      user = await User.findById(userId);
    } else {
      // If it's not a MongoDB ObjectId, assume it's a SuperTokens userId
      user = await User.findOne({ supertokensUserId: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }
    
    // Prevent admin from changing their own role
    if (user.supertokensUserId === adminUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change own role',
        message: 'Admins cannot change their own role'
      });
    }
    
    // Update user role
    user.role = role;
    await user.save();
    
    console.log(`✅ Admin ${adminUserId} updated user ${userId} role to: ${role}`);
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        userId: user.supertokensUserId,
        email: user.email,
        name: user.name,
        role: user.role,
        updatedBy: adminUserId,
        updatedAt: new Date().toISOString()
      }
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
 * Get user profile with role information
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    const userRole = req.session.getAccessTokenPayload().role;
    const userEmail = req.session.getAccessTokenPayload().email;
    const userName = req.session.getAccessTokenPayload().name;
    
    // Get additional user data from database
    const dbUser = await User.findOne({ supertokensUserId: userId });
    
    res.json({
      success: true,
      data: {
        userId: userId,
        email: userEmail,
        name: userName,
        role: userRole,
        isEmailVerified: dbUser?.isEmailVerified || false,
        createdAt: dbUser?.createdAt,
        lastLogin: new Date().toISOString()
      }
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
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter, {
      supertokensUserId: 1,
      email: 1,
      name: 1,
      firstName: 1,
      lastName: 1,
      phone: 1,
      role: 1,
      status: 1,
      isEmailVerified: 1,
      profilePicture: 1,
      createdAt: 1,
      updatedAt: 1,
      lastLoginAt: 1
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        users: users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          usersPerPage: parseInt(limit)
        }
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
 * Create user (Admin only) - with magic link option
 */
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'admin', useMagicLink = false } = req.body;
    const adminUserId = req.session.getUserId();
    
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
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
    }
    
    // Create user in SuperTokens
    const signUpResponse = await EmailPassword.signUp("public", email, password, {
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || ''
    });
    
    if (signUpResponse.status === 'EMAIL_ALREADY_EXISTS_ERROR') {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email already exists in SuperTokens'
      });
    }
    
    if (signUpResponse.status !== 'OK') {
      return res.status(400).json({
        success: false,
        error: 'Failed to create user',
        message: signUpResponse.status
      });
    }
    
    // Create user in our database
    const fullName = (firstName && lastName) ? `${firstName.trim()} ${lastName.trim()}`.trim() :
                    firstName ? firstName.trim() :
                    lastName ? lastName.trim() :
                    email;
    
    const createdUser = await User.createUser(
      signUpResponse.user.id,
      email,
      fullName,
      firstName,
      lastName,
      phone
    );
    
    // Set role
    createdUser.role = role;
    await createdUser.save();
    
    // Sync user data to SuperTokens metadata so it appears in the dashboard
    try {
      const UserMetadata = require('supertokens-node/recipe/usermetadata');
      await UserMetadata.updateUserMetadata(signUpResponse.user.id, {
        first_name: firstName || '',
        last_name: lastName || '',
        name: fullName || '',
        phone: phone || '',
        role: role || 'admin',
        status: status || 'active'
      });
      console.log('✅ User metadata synced to SuperTokens');
    } catch (metadataError) {
      console.error('❌ Error updating SuperTokens metadata:', metadataError);
    }
    
    // Handle email verification based on flag
    if (useMagicLink) {
      try {
        // Generate magic link for email verification
        const recipeUserId = new supertokens.RecipeUserId(signUpResponse.user.id);
        const tokenRes = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email);
        
        if (tokenRes.status === "OK") {
          const magicLinkUrl = `${process.env.BACKEND_URL || 'http://localhost:8081'}/verify-email?token=${tokenRes.token}`;
          
          // Send magic link email
          const emailService = require('../services/emailService');
          const emailResult = await emailService.sendMagicLinkEmail(email, fullName, magicLinkUrl);
          
          if (emailResult.success) {
            console.log('✅ Magic link sent successfully to new user:', email);
          } else {
            console.error('❌ Failed to send magic link email:', emailResult.error);
          }
        }
      } catch (error) {
        console.error('❌ Error sending magic link to new user:', error);
      }
    } else {
      // Send OTP for email verification
      try {
        const otpResult = await createdUser.sendOTPEmail();
        if (otpResult.success) {
          console.log('✅ OTP sent successfully to new user:', email);
        } else {
          console.error('❌ Failed to send OTP email:', otpResult.error);
        }
      } catch (otpError) {
        console.error('❌ Error sending OTP to new user:', otpError);
      }
    }
    
    console.log(`✅ Admin ${adminUserId} created user: ${email} with role: ${role}`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        userId: createdUser.supertokensUserId,
        email: createdUser.email,
        name: createdUser.name,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        phone: createdUser.phone,
        role: createdUser.role,
        isEmailVerified: createdUser.isEmailVerified,
        verificationMethod: useMagicLink ? 'magic_link' : 'otp',
        createdBy: adminUserId,
        createdAt: createdUser.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
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
    const { firstName, lastName, phone, role, status } = req.body;
    const adminUserId = req.session.getUserId();
    
    // Find user in database - support both MongoDB _id and SuperTokens userId
    let user;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      // If it's a MongoDB ObjectId, find by _id
      user = await User.findById(userId);
    } else {
      // If it's not a MongoDB ObjectId, assume it's a SuperTokens userId
      user = await User.findOne({ supertokensUserId: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }
    
    // Prevent admin from changing their own role
    if (role && user.supertokensUserId === adminUserId) {
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
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }
    }
    
    // Update user fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    
    // Update full name if firstName or lastName changed
    if (firstName !== undefined || lastName !== undefined) {
      const newFirstName = firstName !== undefined ? firstName : user.firstName;
      const newLastName = lastName !== undefined ? lastName : user.lastName;
      user.name = (newFirstName && newLastName) ? `${newFirstName.trim()} ${newLastName.trim()}`.trim() :
                  newFirstName ? newFirstName.trim() :
                  newLastName ? newLastName.trim() :
                  user.email;
    }
    
    await user.save();
    
    // Sync updated data to SuperTokens metadata
    try {
      const UserMetadata = require('supertokens-node/recipe/usermetadata');
      const metadataUpdate = {};
      
      if (firstName !== undefined) metadataUpdate.first_name = firstName;
      if (lastName !== undefined) metadataUpdate.last_name = lastName;
      if (phone !== undefined) metadataUpdate.phone = phone;
      if (role !== undefined) metadataUpdate.role = role;
      if (status !== undefined) metadataUpdate.status = status;
      
      if (Object.keys(metadataUpdate).length > 0) {
        await UserMetadata.updateUserMetadata(user.supertokensUserId, metadataUpdate);
        console.log('✅ SuperTokens metadata updated');
      }
    } catch (metadataError) {
      console.error('❌ Error updating SuperTokens metadata:', metadataError);
    }
    
    console.log(`✅ Admin ${adminUserId} updated user ${userId}`);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        userId: user.supertokensUserId,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        updatedBy: adminUserId,
        updatedAt: new Date().toISOString()
      }
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
    
    // Find user in database - support both MongoDB _id and SuperTokens userId
    let user;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      // If it's a MongoDB ObjectId, find by _id
      user = await User.findById(userId);
    } else {
      // If it's not a MongoDB ObjectId, assume it's a SuperTokens userId
      user = await User.findOne({ supertokensUserId: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }
    
    // Prevent admin from deleting themselves
    if (user.supertokensUserId === adminUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete own account',
        message: 'Admins cannot delete their own account'
      });
    }
    
    // Delete user from SuperTokens
    try {
      // First, revoke all sessions for this user
      try {
        const Session = require('supertokens-node/recipe/session');
        await Session.revokeAllSessionsForUser(user.supertokensUserId);
        console.log('✅ All sessions revoked for user:', user.supertokensUserId);
      } catch (sessionError) {
        console.error('❌ Error revoking sessions:', sessionError);
      }
      
      // Remove user roles
      try {
        const UserRoles = require('supertokens-node/recipe/userroles');
        const rolesResponse = await UserRoles.getRolesForUser("public", user.supertokensUserId);
        if (rolesResponse.roles && rolesResponse.roles.length > 0) {
          for (const role of rolesResponse.roles) {
            await UserRoles.removeUserRole("public", user.supertokensUserId, role);
            console.log(`✅ Removed role '${role}' from user`);
          }
        }
      } catch (roleError) {
        console.log('ℹ️ No roles to remove or error removing roles:', roleError.message);
      }
      
      // Delete the user using SuperTokens.deleteUser which works across all recipes
      const deleteResult = await supertokens.deleteUser(user.supertokensUserId);
      
      if (deleteResult.status === "OK") {
        console.log('✅ User deleted from SuperTokens:', user.supertokensUserId);
      } else {
        console.error('❌ Failed to delete user from SuperTokens:', deleteResult);
        
        // Try recipe-specific deletion methods as fallback
        try {
          // Try EmailPassword recipe deletion
          const recipeUserId = new supertokens.RecipeUserId(user.supertokensUserId);
          const epDeleteResult = await EmailPassword.deleteUser(recipeUserId);
          console.log('✅ User deleted from SuperTokens via EmailPassword recipe');
        } catch (epError) {
          console.error('❌ EmailPassword deletion failed:', epError.message);
          
          // Try Passwordless recipe deletion
          try {
            const Passwordless = require('supertokens-node/recipe/passwordless');
            const plDeleteResult = await Passwordless.deleteUser({ userId: user.supertokensUserId });
            console.log('✅ User deleted from SuperTokens via Passwordless recipe');
          } catch (plError) {
            console.error('❌ Passwordless deletion also failed:', plError.message);
            
            // Try ThirdParty recipe deletion
            try {
              const ThirdParty = require('supertokens-node/recipe/thirdparty');
              const tpDeleteResult = await ThirdParty.deleteUser(user.supertokensUserId);
              console.log('✅ User deleted from SuperTokens via ThirdParty recipe');
            } catch (tpError) {
              console.error('❌ All deletion methods failed. User might remain in SuperTokens.');
            }
          }
        }
      }
      
    } catch (supertokensError) {
      console.error('❌ Error deleting user from SuperTokens:', supertokensError);
      // Continue with database deletion even if SuperTokens deletion fails
    }
    
    // Delete user from our database
    await User.deleteOne({ _id: user._id });
    
    console.log(`✅ Admin ${adminUserId} deleted user: ${user.email} (${userId})`);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUserId: user.supertokensUserId,
        deletedUserMongoId: user._id,
        deletedUserEmail: user.email,
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
 * Get user by ID (Admin only)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user in database - support both MongoDB _id and SuperTokens userId
    let user;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      // If it's a MongoDB ObjectId, find by _id
      user = await User.findById(userId);
    } else {
      // If it's not a MongoDB ObjectId, assume it's a SuperTokens userId
      user = await User.findOne({ supertokensUserId: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }
    
    res.json({
      success: true,
      data: {
        userId: user.supertokensUserId,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      }
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
 * Verify current session and get user info
 */
const verifySession = async (req, res) => {
  try {
    const userId = req.session.getUserId();
    const sessionHandle = req.session.getSessionHandle();
    
    // Get user from database
    const user = await User.findOne({ supertokensUserId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User associated with this session does not exist'
      });
    }
    
    // Get user roles from SuperTokens
    let userRoles = [];
    try {
      const UserRoles = require('supertokens-node/recipe/userroles');
      const rolesResponse = await UserRoles.getRolesForUser("public", userId);
      userRoles = rolesResponse.roles || [];
    } catch (roleError) {
      console.log('ℹ️ Could not fetch user roles:', roleError.message);
    }
    
    // Get session data
    const accessTokenPayload = req.session.getAccessTokenPayload();
    
    res.json({
      success: true,
      data: {
        session: {
          userId: userId,
          sessionHandle: sessionHandle,
          isValid: true,
          accessTokenPayload: accessTokenPayload
        },
        user: {
          _id: user._id,
          supertokensUserId: user.supertokensUserId,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          roles: userRoles,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          phone: user.phone,
          profilePicture: user.profilePicture,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt
        }
      }
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
    
    // Revoke the specific session
    try {
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
    } catch (sessionError) {
      console.error('❌ Error revoking session:', sessionError);
      res.status(400).json({
        success: false,
        error: 'Failed to revoke session',
        message: 'Session may not exist or may already be revoked'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in revokeUserSession:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to revoke session'
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
