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
          .select('-emailVerificationOTP -passwordResetOTP -passwordResetToken -otp -otpExpiry -magicLinkToken -magicLinkExpiry'),
        User.countDocuments(filter)
      ]);

      // Sync roles and permissions from SuperTokens for all users
      try {
        console.log('🔄 Syncing roles and permissions for', users.length, 'users...');
        const syncPromises = users.map(async (user) => {
          try {
            await user.syncRolesFromSuperTokens();
            await user.syncPermissionsFromSuperTokens();
          } catch (syncError) {
            console.error(`Error syncing roles/permissions for user ${user._id}:`, syncError);
            // Continue even if sync fails for individual users
          }
        });
        await Promise.all(syncPromises);
        console.log('✅ Roles and permissions sync completed for all users');
      } catch (syncError) {
        console.error('Error in batch sync of roles/permissions:', syncError);
        // Continue even if sync fails
      }

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
        .select('-emailVerificationOTP -passwordResetOTP -passwordResetToken -otp -otpExpiry -magicLinkToken -magicLinkExpiry');

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          data: null
        };
      }

      // Sync roles and permissions from SuperTokens to ensure they're up-to-date
      try {
        await user.syncRolesFromSuperTokens();
        await user.syncPermissionsFromSuperTokens();
      } catch (syncError) {
        console.error('Error syncing roles/permissions for user:', syncError);
        // Continue even if sync fails
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
      console.log('🔄 Updating user status:', { userId, status });
      
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: 'Invalid status. Must be one of: active, inactive'
        };
      }

      // 1. Update MongoDB status
      console.log('🔄 Updating MongoDB status...');
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

      // 2. Update SuperTokens metadata
      console.log('🔄 Updating SuperTokens metadata...');
      const UserMetadata = require('supertokens-node/recipe/usermetadata');
      const isDeactivated = status === 'inactive';
      
      try {
        await UserMetadata.updateUserMetadata(user.supertokensUserId, { 
          isDeactivated: isDeactivated 
        });
        console.log('✅ SuperTokens metadata updated successfully');
      } catch (metadataError) {
        console.error('❌ Failed to update SuperTokens metadata:', metadataError);
        // Continue even if metadata update fails - MongoDB is updated
      }

      // 3. If deactivating, revoke all active sessions
      if (isDeactivated) {
        console.log('🔄 User being deactivated - revoking all sessions...');
        try {
          const revokeResult = await revokeAllUserSessions(user.supertokensUserId);
          if (revokeResult.success) {
            console.log(`✅ Revoked ${revokeResult.revokedCount} sessions for user ${user.supertokensUserId}`);
          } else {
            console.error('❌ Failed to revoke sessions:', revokeResult.error);
          }
        } catch (revokeError) {
          console.error('❌ Error revoking sessions:', revokeError);
          // Continue even if session revocation fails
        }
      }

      return {
        success: true,
        data: user,
        message: `User status updated to ${status}${isDeactivated ? ' and all sessions revoked' : ''}`
      };

    } catch (error) {
      console.error('❌ Error updating user status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

/**
 * Check active sessions for a user (debug function)
 * @param {String} supertokensUserId - SuperTokens User ID
 * @returns {Object} Session check result
 */
async function checkUserSessions(supertokensUserId) {
  try {
    console.log('🔍 Checking sessions for user:', supertokensUserId);
    
    const Session = require('supertokens-node/recipe/session');
    
    // Get all session handles for the user
    const sessionHandles = await Session.getAllSessionHandlesForUser(supertokensUserId);
    console.log(`   Found ${sessionHandles.length} active sessions`);
    console.log('   Session handles:', sessionHandles);
    
    return {
      success: true,
      sessionCount: sessionHandles.length,
      sessionHandles: sessionHandles,
      message: `Found ${sessionHandles.length} active sessions`
    };
    
  } catch (error) {
    console.error('❌ Error checking user sessions:', error);
    return {
      success: false,
      error: error.message,
      sessionCount: 0
    };
  }
}

/**
 * Revoke all active sessions for a user
 * @param {String} supertokensUserId - SuperTokens User ID
 * @returns {Object} Revocation result
 */
async function revokeAllUserSessions(supertokensUserId) {
  try {
    console.log('🔄 Revoking all sessions for user:', supertokensUserId);
    
    const Session = require('supertokens-node/recipe/session');
    
    // Get all session handles for the user
    const sessionHandles = await Session.getAllSessionHandlesForUser(supertokensUserId);
    console.log(`   Found ${sessionHandles.length} active sessions`);
    
    if (sessionHandles.length === 0) {
      console.log('✅ No active sessions to revoke');
      return {
        success: true,
        revokedCount: 0,
        message: 'No active sessions found'
      };
    }
    
    // Revoke all sessions
    let revokedCount = 0;
    for (const sessionHandle of sessionHandles) {
      try {
        await Session.revokeSession(sessionHandle);
        revokedCount++;
        console.log(`   ✅ Revoked session: ${sessionHandle}`);
      } catch (revokeError) {
        console.error(`   ❌ Failed to revoke session ${sessionHandle}:`, revokeError);
      }
    }
    
    console.log(`✅ Successfully revoked ${revokedCount}/${sessionHandles.length} sessions`);
    
    return {
      success: true,
      revokedCount: revokedCount,
      totalSessions: sessionHandles.length,
      message: `Revoked ${revokedCount} out of ${sessionHandles.length} sessions`
    };
    
  } catch (error) {
    console.error('❌ Error revoking user sessions:', error);
    return {
      success: false,
      error: error.message,
      revokedCount: 0
    };
  }
}

/**
 * Update user roles
 * @param {String} userId - MongoDB User ID
 * @param {Array} roles - New roles array
 * @returns {Object} Update result
 */
async function updateUserRoles(userId, roles) {
    try {
      console.log('🔍 updateUserRoles called with:');
      console.log('   userId:', userId, '(type:', typeof userId, ')');
      console.log('   roles:', roles, '(type:', typeof roles, ')');
      
      // Updated to support all roles from permissions.js
      const validRoles = ['admin', 'user', 'viewer', 'manager', 'support_agent', 
        'dashboard_reader', 'dashboard_editor', 'dashboard_owner',
        'tickets_reader', 'tickets_editor', 'tickets_owner',
        'sla_reader', 'sla_editor', 'sla_owner',
        'playbooks_reader', 'playbooks_editor', 'playbooks_owner',
        'aiRca_reader', 'aiRca_editor', 'aiRca_owner',
        'patternDetector_reader', 'patternDetector_editor', 'patternDetector_owner',
        'playbookRecommender_reader', 'playbookRecommender_editor', 'playbookRecommender_owner',
        'customerRcaSummary_reader', 'customerRcaSummary_editor', 'customerRcaSummary_owner',
        'alertCorrelation_reader', 'alertCorrelation_editor', 'alertCorrelation_owner',
        'complianceAudit_reader', 'complianceAudit_editor', 'complianceAudit_owner',
        'chatbot_reader', 'chatbot_editor', 'chatbot_owner',
        'userManagement_reader', 'userManagement_editor', 'userManagement_owner'
      ];
      const invalidRoles = roles.filter(role => !validRoles.includes(role));
      
      if (invalidRoles.length > 0) {
        return {
          success: false,
          error: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`
        };
      }

      // Get user from MongoDB to get SuperTokens ID
      console.log('🔍 Looking up user in MongoDB with ID:', userId);
      const user = await User.findById(userId);
      
      if (!user) {
        console.log('❌ User not found in MongoDB with ID:', userId);
        return {
          success: false,
          error: 'User not found'
        };
      }

      const supertokensUserId = user.supertokensUserId;
      console.log('✅ User found in MongoDB:');
      console.log('   MongoDB ID:', user._id);
      console.log('   SuperTokens ID:', supertokensUserId);
      console.log('   User email:', user.email);
      console.log('   Current MongoDB roles:', user.roles);
      
      // Import RBACService for proper role management
      const RBACService = require('./rbacService');
      const UserRoles = require('supertokens-node/recipe/userroles');
      
      // Get current roles from SuperTokens
      console.log('🔍 Getting current roles from SuperTokens...');
      const currentRolesResult = await RBACService.getUserRoles(supertokensUserId);
      console.log('🔍 SuperTokens getUserRoles result:', currentRolesResult);
      const currentRoles = currentRolesResult.success ? currentRolesResult.roles : [];
      
      console.log(`🔄 Updating roles for user ${userId} (${supertokensUserId})`);
      console.log(`   Current SuperTokens roles: ${currentRoles.join(', ')}`);
      console.log(`   New roles to set: ${roles.join(', ')}`);
      
      // Determine roles to add and remove
      const rolesToAdd = roles.filter(role => !currentRoles.includes(role));
      const rolesToRemove = currentRoles.filter(role => !roles.includes(role));
      
      console.log(`   Roles to add: ${rolesToAdd.join(', ') || 'none'}`);
      console.log(`   Roles to remove: ${rolesToRemove.join(', ') || 'none'}`);
      
      // Remove roles that are no longer needed
      console.log('🔄 Removing roles from SuperTokens...');
      for (const role of rolesToRemove) {
        console.log(`   Removing role: ${role}`);
        const removeResult = await RBACService.removeRoleFromUser(supertokensUserId, role);
        console.log(`   Remove result for ${role}:`, removeResult);
        if (!removeResult.success) {
          console.error(`❌ Failed to remove role ${role}:`, removeResult.error);
        } else {
          console.log(`✅ Removed role ${role} from SuperTokens`);
        }
      }
      
      // Add new roles
      console.log('🔄 Adding roles to SuperTokens...');
      for (const role of rolesToAdd) {
        console.log(`   Adding role: ${role}`);
        const addResult = await RBACService.assignRoleToUser(supertokensUserId, role);
        console.log(`   Add result for ${role}:`, addResult);
        if (!addResult.success) {
          console.error(`❌ Failed to add role ${role}:`, addResult.error);
        } else {
          console.log(`✅ Added role ${role} to SuperTokens`);
        }
      }
      
      // Sync roles and permissions from SuperTokens to MongoDB
      console.log('🔄 Syncing roles and permissions from SuperTokens to MongoDB...');
      try {
        // Get fresh user data to avoid version conflicts
        const freshUser = await User.findById(userId);
        if (freshUser) {
          console.log('   Syncing roles...');
          const rolesSyncResult = await freshUser.syncRolesFromSuperTokens();
          console.log('   Roles sync result:', rolesSyncResult);
          
          console.log('   Syncing permissions...');
          const permissionsSyncResult = await freshUser.syncPermissionsFromSuperTokens();
          console.log('   Permissions sync result:', permissionsSyncResult);
        }
      } catch (syncError) {
        console.error('❌ Error syncing from SuperTokens:', syncError.message);
        // Continue even if sync fails - roles are already in SuperTokens
      }
      
      // Reload user to get updated data
      console.log('🔄 Reloading user from MongoDB...');
      const updatedUser = await User.findById(userId)
        .select('-emailVerificationOTP -passwordResetOTP -passwordResetToken -otp -otpExpiry -magicLinkToken -magicLinkExpiry');

      console.log('✅ User roles updated successfully:');
      console.log('   Final MongoDB roles:', updatedUser.roles);
      console.log('   Final MongoDB permissions:', updatedUser.permissions);

      return {
        success: true,
        data: updatedUser,
        message: `User roles updated to ${updatedUser.roles.join(', ')}`
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
 * Add additional roles to existing user
 * @param {String} userId - MongoDB User ID
 * @param {Array} additionalRoles - Additional roles to add
 * @returns {Object} Update result
 */
async function addUserRoles(userId, additionalRoles) {
    try {
      console.log('🔍 addUserRoles called with:');
      console.log('   userId:', userId, '(type:', typeof userId, ')');
      console.log('   additionalRoles:', additionalRoles, '(type:', typeof additionalRoles, ')');
      
      // Get user from MongoDB to get SuperTokens ID
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const supertokensUserId = user.supertokensUserId;
      
      // Import RBACService for proper role management
      const RBACService = require('./rbacService');
      
      // Get current roles from SuperTokens
      const currentRolesResult = await RBACService.getUserRoles(supertokensUserId);
      const currentRoles = currentRolesResult.success ? currentRolesResult.roles : [];
      
      console.log(`🔄 Adding roles to user ${userId} (${supertokensUserId})`);
      console.log(`   Current roles: ${currentRoles.join(', ')}`);
      console.log(`   Additional roles to add: ${additionalRoles.join(', ')}`);
      
      // Filter out roles that user already has
      const rolesToAdd = additionalRoles.filter(role => !currentRoles.includes(role));
      
      if (rolesToAdd.length === 0) {
        return {
          success: true,
          message: 'User already has all the specified roles',
          data: user
        };
      }
      
      console.log(`   New roles to add: ${rolesToAdd.join(', ') || 'none'}`);
      
      // Add new roles
      for (const role of rolesToAdd) {
        const addResult = await RBACService.assignRoleToUser(supertokensUserId, role);
        if (!addResult.success) {
          console.error(`❌ Failed to add role ${role}:`, addResult.error);
        } else {
          console.log(`✅ Added role ${role} to SuperTokens`);
        }
      }
      
      // Sync roles and permissions from SuperTokens to MongoDB
      console.log('🔄 Syncing roles and permissions from SuperTokens to MongoDB...');
      try {
        // Get fresh user data to avoid version conflicts
        const freshUser = await User.findById(userId);
        if (freshUser) {
          console.log('   Syncing roles...');
          const rolesSyncResult = await freshUser.syncRolesFromSuperTokens();
          console.log('   Roles sync result:', rolesSyncResult);
          
          console.log('   Syncing permissions...');
          const permissionsSyncResult = await freshUser.syncPermissionsFromSuperTokens();
          console.log('   Permissions sync result:', permissionsSyncResult);
        }
      } catch (syncError) {
        console.error('❌ Error syncing from SuperTokens:', syncError.message);
        // Continue even if sync fails - roles are already in SuperTokens
      }
      
      // Reload user to get updated data
      const updatedUser = await User.findById(userId)
        .select('-emailVerificationOTP -passwordResetOTP -passwordResetToken -otp -otpExpiry -magicLinkToken -magicLinkExpiry');

      console.log(`✅ Additional roles added successfully. User now has: ${updatedUser.roles.join(', ')}`);

      return {
        success: true,
        data: updatedUser,
        message: `Additional roles added: ${rolesToAdd.join(', ')}`
      };

    } catch (error) {
      console.error('Error adding user roles:', error);
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
      const { email, password, firstName, lastName, phone, roles = ['viewer'] } = userData;

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

      // Assign roles to user in SuperTokens
      // Validate roles first - now includes all roles from permissions.js
      const UserRoles = require('supertokens-node/recipe/userroles');
      const validRoles = ['admin', 'user', 'viewer', 'manager', 'support_agent', 
        'dashboard_reader', 'dashboard_editor', 'dashboard_owner',
        'tickets_reader', 'tickets_editor', 'tickets_owner',
        'sla_reader', 'sla_editor', 'sla_owner',
        'playbooks_reader', 'playbooks_editor', 'playbooks_owner',
        'aiRca_reader', 'aiRca_editor', 'aiRca_owner',
        'patternDetector_reader', 'patternDetector_editor', 'patternDetector_owner',
        'playbookRecommender_reader', 'playbookRecommender_editor', 'playbookRecommender_owner',
        'customerRcaSummary_reader', 'customerRcaSummary_editor', 'customerRcaSummary_owner',
        'alertCorrelation_reader', 'alertCorrelation_editor', 'alertCorrelation_owner',
        'complianceAudit_reader', 'complianceAudit_editor', 'complianceAudit_owner',
        'chatbot_reader', 'chatbot_editor', 'chatbot_owner',
        'userManagement_reader', 'userManagement_editor', 'userManagement_owner'
      ];
      const rolesToAssign = roles && Array.isArray(roles) && roles.length > 0 
        ? roles.filter(role => validRoles.includes(role))
        : [];
      
      // Default to 'viewer' role if no valid roles provided
      if (rolesToAssign.length === 0) {
        rolesToAssign.push('viewer');
      }
      
      console.log(`🔐 Roles to assign: ${rolesToAssign.join(', ')}`);
      
      try {
        // Assign each role to the user (with tenant ID "public")
        for (const role of rolesToAssign) {
          await UserRoles.addRoleToUser("public", supertokensUserId, role);
          console.log(`✅ Role "${role}" assigned to user in SuperTokens`);
        }
        
        console.log('✅ All roles assigned successfully to SuperTokens:', rolesToAssign);
      } catch (roleError) {
        console.error('❌ Failed to assign roles to SuperTokens:', roleError);
        // Don't fail user creation if role assignment fails, but log it
      }

      // Create user in MongoDB with SuperTokens ID (same as registration flow)
      try {
        console.log('Creating user in MongoDB with data:', {
          supertokensUserId,
          email: email.toLowerCase(),
          fullName,
          firstName,
          lastName,
          phone,
          roles: rolesToAssign
        });
        
        const user = await User.createUser(
          supertokensUserId,
          email.toLowerCase(),
          fullName,
          firstName,
          lastName,
          phone,
          rolesToAssign, // Use the validated roles that were assigned to SuperTokens
          [] // permissions will be synced from SuperTokens
        );
        
        console.log('✅ User created successfully in MongoDB:', user._id);
        
        // Sync roles and permissions from SuperTokens to MongoDB
        try {
          console.log('🔄 Syncing roles and permissions from SuperTokens...');
          const rolesResult = await user.syncRolesFromSuperTokens();
          const permissionsResult = await user.syncPermissionsFromSuperTokens();
          
          if (rolesResult.success) {
            console.log('✅ Roles synced successfully:', rolesResult.roles);
          } else {
            console.error('❌ Failed to sync roles:', rolesResult.error);
          }
          
          if (permissionsResult.success) {
            console.log('✅ Permissions synced successfully:', permissionsResult.permissions);
          } else {
            console.error('❌ Failed to sync permissions:', permissionsResult.error);
          }
        } catch (syncError) {
          console.error('❌ Error syncing roles/permissions:', syncError);
          // Don't fail user creation if sync fails, but log it
        }
        
        // Send OTP for email verification using the user object directly
        let otpData = null;
        try {
          console.log('🔍 Starting OTP sending process...');
          console.log('   User email:', email);
          console.log('   User name:', user.name);
          console.log('   User ID:', user._id);
          
          // Generate OTP and send using the user object we just created
          console.log('🔄 Generating OTP...');
          const otp = user.generateOTP();
          console.log('   Generated OTP:', otp);
          console.log('   OTP expiry:', user.emailVerificationOTP?.expiresAt);
          
          console.log('🔄 Saving user with OTP...');
          await user.save();
          console.log('✅ User saved with OTP');
          
          // Send OTP email using custom email service
          console.log('🔄 Calling emailService.sendOTPEmail...');
          console.log('   Parameters:', {
            email: user.email,
            name: user.name,
            otp: otp
          });
          
          const emailResult = await emailService.sendOTPEmail(user.email, user.name, otp);
          console.log('🔍 Email service result:', emailResult);
          
          if (emailResult.success) {
            otpData = {
              deviceId: 'custom-otp',
              preAuthSessionId: user.supertokensUserId
            };
            console.log('✅ OTP sent successfully');
            console.log('   OTP data:', otpData);
          } else {
            console.error('❌ Failed to send OTP:');
            console.error('   Error:', emailResult.error);
            console.error('   Full result:', emailResult);
            // Don't fail user creation if OTP fails, but log it
          }
        } catch (otpError) {
          console.error('❌ Error sending OTP:');
          console.error('   Error message:', otpError.message);
          console.error('   Error stack:', otpError.stack);
          console.error('   Full error:', otpError);
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
  checkUserSessions,
  revokeAllUserSessions,
  updateUserRoles,
  addUserRoles,
  deleteUser,
  createUser
};
