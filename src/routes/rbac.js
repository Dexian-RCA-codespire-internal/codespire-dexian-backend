// new file servicenow
const express = require('express');
const { body } = require('express-validator');
const RBACController = require('../controllers/rbacController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createRoleValidation = [
  body('role').notEmpty().withMessage('Role is required'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
];

const assignRoleValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('role').notEmpty().withMessage('Role is required')
];

const createPermissionValidation = [
  body('permission').notEmpty().withMessage('Permission is required')
];

const assignPermissionValidation = [
  body('role').notEmpty().withMessage('Role is required'),
  body('permission').notEmpty().withMessage('Permission is required')
];

// Role management routes
router.post('/roles', authenticateToken, requirePermission('roles:write'), createRoleValidation, RBACController.createRole);
router.get('/roles', authenticateToken, requirePermission('roles:read'), RBACController.getAllRoles);
router.post('/roles/assign', authenticateToken, requirePermission('roles:write'), assignRoleValidation, RBACController.assignRoleToUser);
router.post('/roles/remove', authenticateToken, requirePermission('roles:write'), assignRoleValidation, RBACController.removeRoleFromUser);
router.get('/roles/:userId', authenticateToken, requirePermission('roles:read'), RBACController.getUserRoles);
router.get('/roles/check/:userId/:role', authenticateToken, requirePermission('roles:read'), RBACController.checkUserRole);
router.get('/roles/users/:role', authenticateToken, requirePermission('roles:read'), RBACController.getUsersWithRole);

// Permission management routes
router.post('/permissions', authenticateToken, requirePermission('permissions:write'), createPermissionValidation, RBACController.createPermission);
router.get('/permissions', authenticateToken, requirePermission('permissions:read'), RBACController.getAllPermissions);
router.post('/permissions/assign', authenticateToken, requirePermission('permissions:write'), assignPermissionValidation, RBACController.assignPermissionToRole);
router.post('/permissions/remove', authenticateToken, requirePermission('permissions:write'), assignPermissionValidation, RBACController.removePermissionFromRole);
router.get('/permissions/:userId', authenticateToken, requirePermission('permissions:read'), RBACController.getUserPermissions);
router.get('/permissions/check/:userId/:permission', authenticateToken, requirePermission('permissions:read'), RBACController.checkUserPermission);

// User RBAC management
router.get('/users/:userId/sync', authenticateToken, requirePermission('users:read'), RBACController.syncUserRBAC);

// Initialize default roles and permissions (admin only)
router.post('/initialize', authenticateToken, requirePermission('roles:write'), RBACController.initializeDefaults);

// Debug endpoint to check current user's roles and permissions
router.get('/debug/current-user', authenticateToken, async (req, res) => {
  try {
    const userId = req.session.getUserId();
    const RBACService = require('../services/rbacService');
    
    console.log('🔍 Debug: Checking current user:', userId);
    
    const rolesResult = await RBACService.getUserRoles(userId);
    const permissionsResult = await RBACService.getUserPermissions(userId);
    
    res.json({
      success: true,
      userId: userId,
      roles: rolesResult.success ? rolesResult.roles : [],
      permissions: permissionsResult.success ? permissionsResult.permissions : [],
      rolesResult: rolesResult,
      permissionsResult: permissionsResult
    });
  } catch (error) {
    console.error('🔍 Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint without authentication to check session status
router.get('/debug/session', async (req, res) => {
  try {
    console.log('🔍 Debug: Checking session status');
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Cookies:', req.cookies);
    console.log('🔍 Session exists:', !!req.session);
    
    if (req.session) {
      try {
        const userId = req.session.getUserId();
        console.log('🔍 User ID from session:', userId);
        
        const RBACService = require('../services/rbacService');
        const rolesResult = await RBACService.getUserRoles(userId);
        const permissionsResult = await RBACService.getUserPermissions(userId);
        
        res.json({
          success: true,
          sessionExists: true,
          userId: userId,
          roles: rolesResult.success ? rolesResult.roles : [],
          permissions: permissionsResult.success ? permissionsResult.permissions : [],
          rolesResult: rolesResult,
          permissionsResult: permissionsResult
        });
      } catch (sessionError) {
        console.error('🔍 Session error:', sessionError);
        res.json({
          success: false,
          sessionExists: true,
          error: sessionError.message
        });
      }
    } else {
      res.json({
        success: false,
        sessionExists: false,
        message: 'No session found'
      });
    }
  } catch (error) {
    console.error('🔍 Debug session endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to test role assignment (no auth required for testing)
router.post('/debug/assign-role', async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        error: 'userId and role are required'
      });
    }
    
    console.log('🔍 Debug: Assigning role', role, 'to user', userId);
    
    const RBACService = require('../services/rbacService');
    const result = await RBACService.assignRoleToUser(userId, role);
    
    res.json({
      success: result.success,
      message: result.message,
      error: result.error
    });
  } catch (error) {
    console.error('🔍 Debug assign role error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
