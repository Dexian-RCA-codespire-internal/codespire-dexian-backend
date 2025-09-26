// new file servicenow
const { body, validationResult } = require('express-validator');
const RBACService = require('../services/rbacService');
const User = require('../models/User');

class RBACController {
  /**
   * Create a new role
   */
  static async createRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role, permissions = [] } = req.body;

      const result = await RBACService.createRole(role, permissions);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            role: result.role,
            permissions: result.permissions
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get all roles
   */
  static async getAllRoles(req, res) {
    try {
      const result = await RBACService.getAllRoles();

      if (result.success) {
        res.json({
          success: true,
          data: {
            roles: result.roles
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get all roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, role } = req.body;

      const result = await RBACService.assignRoleToUser(userId, role);

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Assign role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, role } = req.body;

      const result = await RBACService.removeRoleFromUser(userId, role);

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Remove role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user roles
   */
  static async getUserRoles(req, res) {
    try {
      const { userId } = req.params;

      const result = await RBACService.getUserRoles(userId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            roles: result.roles
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get user roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;

      const result = await RBACService.getUserPermissions(userId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            permissions: result.permissions
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Check if user has role
   */
  static async checkUserRole(req, res) {
    try {
      const { userId, role } = req.params;

      const result = await RBACService.userHasRole(userId, role);

      if (result.success) {
        res.json({
          success: true,
          data: {
            hasRole: result.hasRole
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Check user role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Check if user has permission
   */
  static async checkUserPermission(req, res) {
    try {
      const { userId, permission } = req.params;

      const result = await RBACService.userHasPermission(userId, permission);

      if (result.success) {
        res.json({
          success: true,
          data: {
            hasPermission: result.hasPermission
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Check user permission error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Create permission
   */
  static async createPermission(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { permission } = req.body;

      const result = await RBACService.createPermission(permission);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            permission: result.permission
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Create permission error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get all permissions
   */
  static async getAllPermissions(req, res) {
    try {
      const result = await RBACService.getAllPermissions();

      if (result.success) {
        res.json({
          success: true,
          data: {
            permissions: result.permissions
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get all permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Assign permission to role
   */
  static async assignPermissionToRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role, permission } = req.body;

      const result = await RBACService.assignPermissionToRole(role, permission);

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Assign permission to role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Remove permission from role
   */
  static async removePermissionFromRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role, permission } = req.body;

      const result = await RBACService.removePermissionFromRole(role, permission);

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Remove permission from role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get users with specific role
   */
  static async getUsersWithRole(req, res) {
    try {
      const { role } = req.params;

      const result = await RBACService.getUsersWithRole(role);

      if (result.success) {
        res.json({
          success: true,
          data: {
            users: result.users
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get users with role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Initialize default roles and permissions
   */
  static async initializeDefaults(req, res) {
    try {
      const result = await RBACService.initializeDefaultRolesAndPermissions();

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Initialize defaults error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Sync user roles and permissions from SuperTokens
   */
  static async syncUserRBAC(req, res) {
    try {
      const { userId } = req.params;

      // Get user from MongoDB
      const user = await User.findBySupertokensUserId(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Sync roles and permissions
      const rolesResult = await user.syncRolesFromSuperTokens();
      const permissionsResult = await user.syncPermissionsFromSuperTokens();

      if (rolesResult.success && permissionsResult.success) {
        res.json({
          success: true,
          message: 'User RBAC synced successfully',
          data: {
            roles: rolesResult.roles,
            permissions: permissionsResult.permissions
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to sync user RBAC'
        });
      }
    } catch (error) {
      console.error('Sync user RBAC error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = RBACController;
