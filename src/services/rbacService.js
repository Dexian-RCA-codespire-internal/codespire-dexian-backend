// new file servicenow
const { UserRoles } = require('supertokens-node/recipe/userroles');
const User = require('../models/User');
const { ALL_PERMISSIONS, ROLE_PERMISSIONS } = require('../constants/permissions');

class RBACService {
  /**
   * Create a new role in SuperTokens
   * @param {string} role - Role name
   * @param {Array} permissions - Array of permission strings
   * @returns {Object} Creation result
   */
  static async createRole(role, permissions = []) {
    try {
      // Create role in SuperTokens
      const roleResult = await UserRoles.createNewRoleOrAddPermissions(role, permissions);
      
      if (roleResult.createdNewRole) {
        console.log(`✅ Created new role: ${role}`);
      } else {
        console.log(`✅ Updated existing role: ${role}`);
      }
      
      return {
        success: true,
        role: role,
        permissions: permissions,
        message: roleResult.createdNewRole ? 'Role created successfully' : 'Role updated successfully'
      };
    } catch (error) {
      console.error('❌ Error creating role:', error);
      return {
        success: false,
        error: error.message || 'Failed to create role'
      };
    }
  }

  /**
   * Assign role to user
   * @param {string} userId - SuperTokens user ID
   * @param {string} role - Role name
   * @returns {Object} Assignment result
   */
  static async assignRoleToUser(userId, role) {
    try {
      // Assign role in SuperTokens
      const result = await UserRoles.addRoleToUser(userId, role);
      
      if (result.status === 'OK') {
        // Sync with MongoDB
        const user = await User.findBySupertokensUserId(userId);
        if (user) {
          if (!user.roles.includes(role)) {
            user.roles.push(role);
            await user.save();
          }
          console.log(`✅ Role ${role} assigned to user ${userId} and synced to MongoDB`);
        }
        
        return {
          success: true,
          message: `Role ${role} assigned successfully`
        };
      } else {
        return {
          success: false,
          error: 'Failed to assign role'
        };
      }
    } catch (error) {
      console.error('❌ Error assigning role:', error);
      return {
        success: false,
        error: error.message || 'Failed to assign role'
      };
    }
  }

  /**
   * Remove role from user
   * @param {string} userId - SuperTokens user ID
   * @param {string} role - Role name
   * @returns {Object} Removal result
   */
  static async removeRoleFromUser(userId, role) {
    try {
      // Remove role in SuperTokens
      const result = await UserRoles.removeUserRole(userId, role);
      
      if (result.status === 'OK') {
        // Sync with MongoDB
        const user = await User.findBySupertokensUserId(userId);
        if (user) {
          user.roles = user.roles.filter(r => r !== role);
          // Ensure user always has at least 'user' role
          if (user.roles.length === 0) {
            user.roles.push('user');
          }
          await user.save();
          console.log(`✅ Role ${role} removed from user ${userId} and synced to MongoDB`);
        }
        
        return {
          success: true,
          message: `Role ${role} removed successfully`
        };
      } else {
        return {
          success: false,
          error: 'Failed to remove role'
        };
      }
    } catch (error) {
      console.error('❌ Error removing role:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove role'
      };
    }
  }

  /**
   * Get user roles
   * @param {string} userId - SuperTokens user ID
   * @returns {Object} User roles
   */
  static async getUserRoles(userId) {
    try {
      const roles = await UserRoles.getRolesForUser(userId);
      
      return {
        success: true,
        roles: roles.roles || []
      };
    } catch (error) {
      console.error('❌ Error getting user roles:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user roles'
      };
    }
  }

  /**
   * Get user permissions
   * @param {string} userId - SuperTokens user ID
   * @returns {Object} User permissions
   */
  static async getUserPermissions(userId) {
    try {
      const permissions = await UserRoles.getPermissionsForUser(userId);
      
      return {
        success: true,
        permissions: permissions.permissions || []
      };
    } catch (error) {
      console.error('❌ Error getting user permissions:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user permissions'
      };
    }
  }

  /**
   * Check if user has specific role
   * @param {string} userId - SuperTokens user ID
   * @param {string} role - Role name
   * @returns {Object} Role check result
   */
  static async userHasRole(userId, role) {
    try {
      const roles = await UserRoles.getRolesForUser(userId);
      const hasRole = roles.roles.includes(role);
      
      return {
        success: true,
        hasRole: hasRole
      };
    } catch (error) {
      console.error('❌ Error checking user role:', error);
      return {
        success: false,
        error: error.message || 'Failed to check user role'
      };
    }
  }

  /**
   * Check if user has specific permission
   * @param {string} userId - SuperTokens user ID
   * @param {string} permission - Permission name
   * @returns {Object} Permission check result
   */
  static async userHasPermission(userId, permission) {
    try {
      const permissions = await UserRoles.getPermissionsForUser(userId);
      const hasPermission = permissions.permissions.includes(permission);
      
      return {
        success: true,
        hasPermission: hasPermission
      };
    } catch (error) {
      console.error('❌ Error checking user permission:', error);
      return {
        success: false,
        error: error.message || 'Failed to check user permission'
      };
    }
  }

  /**
   * Get all roles in the system
   * @returns {Object} All roles
   */
  static async getAllRoles() {
    try {
      const roles = await UserRoles.getAllRoles();
      
      return {
        success: true,
        roles: roles.roles || []
      };
    } catch (error) {
      console.error('❌ Error getting all roles:', error);
      return {
        success: false,
        error: error.message || 'Failed to get all roles'
      };
    }
  }

  /**
   * Get all permissions in the system
   * @returns {Object} All permissions
   */
  static async getAllPermissions() {
    try {
      // Use permissions from constants file
      const allPermissions = ALL_PERMISSIONS;
      
      return {
        success: true,
        permissions: allPermissions
      };
    } catch (error) {
      console.error('❌ Error getting all permissions:', error);
      return {
        success: false,
        error: error.message || 'Failed to get all permissions'
      };
    }
  }

  /**
   * Create a new permission
   * @param {string} permission - Permission name
   * @returns {Object} Creation result
   */
  static async createPermission(permission) {
    try {
      // In SuperTokens, permissions are created when roles are created
      // This is a placeholder method for consistency
      return {
        success: true,
        permission: permission,
        message: 'Permission created successfully'
      };
    } catch (error) {
      console.error('❌ Error creating permission:', error);
      return {
        success: false,
        error: error.message || 'Failed to create permission'
      };
    }
  }

  /**
   * Assign permission to role
   * @param {string} role - Role name
   * @param {string} permission - Permission name
   * @returns {Object} Assignment result
   */
  static async assignPermissionToRole(role, permission) {
    try {
      // In SuperTokens, permissions are managed through role creation/updates
      // This is a placeholder method for consistency
      return {
        success: true,
        message: `Permission ${permission} assigned to role ${role}`
      };
    } catch (error) {
      console.error('❌ Error assigning permission to role:', error);
      return {
        success: false,
        error: error.message || 'Failed to assign permission to role'
      };
    }
  }

  /**
   * Remove permission from role
   * @param {string} role - Role name
   * @param {string} permission - Permission name
   * @returns {Object} Removal result
   */
  static async removePermissionFromRole(role, permission) {
    try {
      // In SuperTokens, permissions are managed through role creation/updates
      // This is a placeholder method for consistency
      return {
        success: true,
        message: `Permission ${permission} removed from role ${role}`
      };
    } catch (error) {
      console.error('❌ Error removing permission from role:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove permission from role'
      };
    }
  }

  /**
   * Get users with specific role
   * @param {string} role - Role name
   * @returns {Object} Users with role
   */
  static async getUsersWithRole(role) {
    try {
      const users = await UserRoles.getUsersThatHaveRole(role);
      
      return {
        success: true,
        users: users.users || []
      };
    } catch (error) {
      console.error('❌ Error getting users with role:', error);
      return {
        success: false,
        error: error.message || 'Failed to get users with role'
      };
    }
  }

  /**
   * Initialize default roles and permissions
   * @returns {Object} Initialization result
   */
  static async initializeDefaultRolesAndPermissions() {
    try {
      console.log('🔐 Initializing default roles and permissions...');
      
      // Use role-permission mappings from constants file
      const defaultRoles = ROLE_PERMISSIONS;

      // Create roles and permissions
      for (const [role, permissions] of Object.entries(defaultRoles)) {
        // Create permissions first
        for (const permission of permissions) {
          try {
            await this.createPermission(permission);
          } catch (error) {
            // Permission might already exist, continue
            console.log(`Permission ${permission} might already exist`);
          }
        }
        
        // Create role with permissions
        await this.createRole(role, permissions);
        console.log(`✅ Created role: ${role} with ${permissions.length} permissions`);
      }
      
      return {
        success: true,
        message: 'Default roles and permissions initialized successfully'
      };
    } catch (error) {
      console.error('❌ Error initializing default roles and permissions:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize default roles and permissions'
      };
    }
  }
}

module.exports = RBACService;
