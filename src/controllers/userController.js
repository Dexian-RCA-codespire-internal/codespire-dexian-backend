const User = require('../models/User');
const { requireAdmin, getUserRole } = require('../middleware/roleAuth');
const supertokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const EmailVerification = require('supertokens-node/recipe/emailverification');

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
    
    // Find user in database
    const user = await User.findOne({ supertokensUserId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }
    
    // Prevent admin from changing their own role
    if (userId === adminUserId) {
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
    
    // Find user in database
    const user = await User.findOne({ supertokensUserId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }
    
    // Prevent admin from changing their own role
    if (role && userId === adminUserId) {
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
    
    // Prevent admin from deleting themselves
    if (userId === adminUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete own account',
        message: 'Admins cannot delete their own account'
      });
    }
    
    // Find user in database
    const user = await User.findOne({ supertokensUserId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }
    
    // Delete user from SuperTokens
    try {
      const recipeUserId = new supertokens.RecipeUserId(userId);
      await EmailPassword.deleteUser(recipeUserId);
      console.log('✅ User deleted from SuperTokens:', userId);
    } catch (supertokensError) {
      console.error('❌ Error deleting user from SuperTokens:', supertokensError);
      // Continue with database deletion even if SuperTokens deletion fails
    }
    
    // Delete user from our database
    await User.deleteOne({ supertokensUserId: userId });
    
    console.log(`✅ Admin ${adminUserId} deleted user: ${user.email} (${userId})`);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUserId: userId,
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
    
    const user = await User.findOne({ supertokensUserId: userId });
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

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  updateUserRole,
  getUserProfile,
  getAllUsers
};
