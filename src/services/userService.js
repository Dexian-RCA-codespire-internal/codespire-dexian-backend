// new file servicenow
const User = require('../models/User');
const { signUp } = require('supertokens-node/recipe/emailpassword');
const UserMetadata = require('supertokens-node/recipe/usermetadata');
const supertokens = require('supertokens-node');
const SuperTokensOTPService = require('./supertokensOTPService');
const emailService = require('./emailService');

// Configuration constants
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Fetch users from database with pagination and filtering
 * @param {Object} options - Query options
 * @returns {Object} Result with users data and pagination info
 */
async function fetchUsersFromDB(options = {}) {
    try {
      const {
        page = 1,
        limit = DEFAULT_LIMIT,
        query = '',
        role = '',
        status = '',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        updatedSince = null
      } = options;

      // Validate and sanitize inputs
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Build query filter
      const filter = {};

      // Text search across name and email
      if (query && query.trim()) {
        filter.$or = [
          { name: { $regex: query.trim(), $options: 'i' } },
          { email: { $regex: query.trim(), $options: 'i' } }
        ];
      }

      // Role filter
      if (role && role !== 'all') {
        filter.roles = role;
      }

      // Status filter
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Updated since filter
      if (updatedSince) {
        filter.updatedAt = { $gte: new Date(updatedSince) };
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const [users, totalCount] = await Promise.all([
        User.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .select('-emailVerificationOTP -passwordResetOTP -passwordResetToken -otp -otpExpiry -magicLinkToken -magicLinkExpiry')
          .lean(),
        User.countDocuments(filter)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      return {
        success: true,
        data: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages,
          hasNext,
          hasPrev
        }
      };

    } catch (error) {
      console.error('Error fetching users from database:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: {
          page: 1,
          limit: DEFAULT_LIMIT,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
}

/**
 * Get user statistics
 * @param {Object} options - Query options
 * @returns {Object} User statistics
 */
async function getUserStats(options = {}) {
    try {
      const { role = '', status = '' } = options;

      // Build base filter
      const filter = {};
      if (role && role !== 'all') {
        filter.roles = role;
      }
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Get statistics
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        regularUsers,
        recentUsers
      ] = await Promise.all([
        User.countDocuments(filter),
        User.countDocuments({ ...filter, status: 'active' }),
        User.countDocuments({ ...filter, status: 'inactive' }),
        User.countDocuments({ ...filter, roles: 'admin' }),
        User.countDocuments({ ...filter, roles: 'user' }),
        User.countDocuments({
          ...filter,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        })
      ]);

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          adminUsers,
          regularUsers,
          recentUsers,
          userDistribution: {
            active: activeUsers,
            inactive: inactiveUsers
          },
          roleDistribution: {
            admin: adminUsers,
            user: regularUsers
          }
        }
      };

    } catch (error) {
      console.error('Error getting user statistics:', error);
      return {
        success: false,
        error: error.message,
        data: {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          adminUsers: 0,
          regularUsers: 0,
          recentUsers: 0,
          userDistribution: { active: 0, inactive: 0 },
          roleDistribution: { admin: 0, user: 0 }
        }
      };
    }
}

/**
 * Get user by ID
 * @param {String} userId - User ID
 * @returns {Object} User data
 */
async function getUserById(userId) {
    try {
      const user = await User.findById(userId)
        .select('-emailVerificationOTP -passwordResetOTP -passwordResetToken -otp -otpExpiry -magicLinkToken -magicLinkExpiry')
        .lean();

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          data: null
        };
      }

      return {
        success: true,
        data: user
      };

    } catch (error) {
      console.error('Error getting user by ID:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
}

/**
 * Update user status
 * @param {String} userId - User ID
 * @param {String} status - New status
 * @returns {Object} Update result
 */
async function updateUserStatus(userId, status) {
    try {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: 'Invalid status. Must be one of: active, inactive, suspended'
        };
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { status },
        { new: true, runValidators: true }
      ).select('-emailVerificationOTP -passwordResetOTP -passwordResetToken -otp -otpExpiry -magicLinkToken -magicLinkExpiry');

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        data: user,
        message: `User status updated to ${status}`
      };

    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: error.message
      };
    }
}

/**
 * Update user roles
 * @param {String} userId - User ID
 * @param {Array} roles - New roles array
 * @returns {Object} Update result
 */
async function updateUserRoles(userId, roles) {
    try {
      const validRoles = ['user', 'admin'];
      const invalidRoles = roles.filter(role => !validRoles.includes(role));
      
      if (invalidRoles.length > 0) {
        return {
          success: false,
          error: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`
        };
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { roles },
        { new: true, runValidators: true }
      ).select('-emailVerificationOTP -passwordResetOTP -passwordResetToken -otp -otpExpiry -magicLinkToken -magicLinkExpiry');

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        data: user,
        message: `User roles updated to ${roles.join(', ')}`
      };

    } catch (error) {
      console.error('Error updating user roles:', error);
      return {
        success: false,
        error: error.message
      };
    }
}

/**
 * Delete user from both SuperTokens and MongoDB
 * @param {String} userId - MongoDB User ID
 * @returns {Object} Delete result
 */
async function deleteUser(userId) {
    try {
      // First get the user to find SuperTokens ID
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const supertokensUserId = user.supertokensUserId;

      // Delete from SuperTokens first
      try {
        await supertokens.deleteUser(supertokensUserId);
        console.log('✅ User deleted from SuperTokens:', supertokensUserId);
      } catch (stError) {
        console.error('❌ Error deleting user from SuperTokens:', stError);
        // Continue with MongoDB deletion even if SuperTokens fails
      }

      // Delete from MongoDB
      await User.findByIdAndDelete(userId);

      return {
        success: true,
        message: 'User deleted successfully from SuperTokens and MongoDB'
      };

    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message
      };
    }
}

/**
 * Create new user with SuperTokens integration (following registration flow)
 * @param {Object} userData - User data
 * @returns {Object} Create result
 */
async function createUser(userData) {
    try {
      const { email, password, firstName, lastName, phone } = userData;

      // Validate required fields
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Generate full name from firstName and lastName
      const fullName = (firstName && lastName) ? `${firstName.trim()} ${lastName.trim()}`.trim() :
                      firstName ? firstName.trim() :
                      lastName ? lastName.trim() :
                      email;

      // Create user in SuperTokens first (same as registration flow)
      const superTokensResponse = await signUp('public', email.toLowerCase(), password);
      
      if (superTokensResponse.status !== 'OK') {
        return {
          success: false,
          error: 'Failed to create user in SuperTokens: ' + superTokensResponse.status
        };
      }

      const supertokensUserId = superTokensResponse.user.id;

      // Store user metadata in SuperTokens (same as registration flow)
      const userMetadata = { name: fullName };
      if (firstName) userMetadata.firstName = firstName;
      if (lastName) userMetadata.lastName = lastName;
      if (phone) userMetadata.phone = phone;

      await UserMetadata.updateUserMetadata(supertokensUserId, userMetadata);

      // Create user in MongoDB with SuperTokens ID (same as registration flow)
      try {
        console.log('Creating user in MongoDB with data:', {
          supertokensUserId,
          email: email.toLowerCase(),
          fullName,
          firstName,
          lastName,
          phone
        });
        
        const user = await User.createUser(
          supertokensUserId,
          email.toLowerCase(),
          fullName,
          firstName,
          lastName,
          phone
        );
        
        console.log('✅ User created successfully in MongoDB:', user._id);
        
        // Send OTP for email verification using the user object directly
        let otpData = null;
        try {
          console.log('Sending OTP for email verification to:', email);
          
          // Generate OTP and send using the user object we just created
          const otp = user.generateOTP();
          await user.save();
          
          // Send OTP email using custom email service
          const emailResult = await emailService.sendOTPEmail(user.email, user.name, otp);
          
          if (emailResult.success) {
            otpData = {
              deviceId: 'custom-otp',
              preAuthSessionId: user.supertokensUserId
            };
            console.log('✅ OTP sent successfully');
          } else {
            console.error('❌ Failed to send OTP:', emailResult.error);
            // Don't fail user creation if OTP fails, but log it
          }
        } catch (otpError) {
          console.error('❌ Error sending OTP:', otpError);
          // Don't fail user creation if OTP fails, but log it
        }
        
        return {
          success: true,
          data: user,
          message: otpData 
            ? 'User created successfully and verification OTP sent'
            : 'User created successfully (verification OTP could not be sent)',
          otpData: otpData // Include OTP data for frontend if needed
        };
      } catch (mongoError) {
        console.error('❌ Error creating user in MongoDB:', mongoError);
        
        // Return partial success - user exists in SuperTokens but not in MongoDB
        return {
          success: false,
          error: `User created in SuperTokens but failed to create in MongoDB: ${mongoError.message}`,
          supertokensUserId: supertokensUserId
        };
      }

    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
}

module.exports = {
  fetchUsersFromDB,
  getUserStats,
  getUserById,
  updateUserStatus,
  updateUserRoles,
  deleteUser,
  createUser
};
