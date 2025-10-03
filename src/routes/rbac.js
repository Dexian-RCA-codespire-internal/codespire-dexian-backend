// new file servicenow
const express = require('express');
const { body } = require('express-validator');
const RBACController = require('../controllers/rbacController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { doc } = require('../utils/apiDoc');

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
router.post('/roles', 
  authenticateToken, 
  requirePermission('roles:write'), 
  doc.create('/rbac/roles', 'Create a new role', ['RBAC']),
  createRoleValidation, 
  RBACController.createRole);

router.get('/roles', 
  authenticateToken, 
  requirePermission('roles:read'), 
  doc.getList('/rbac/roles', 'Get all roles', ['RBAC']),
  RBACController.getAllRoles);

router.post('/roles/assign', 
  authenticateToken, 
  requirePermission('roles:write'), 
  doc.create('/rbac/roles/assign', 'Assign role to user', ['RBAC']),
  assignRoleValidation, 
  RBACController.assignRoleToUser);

router.post('/roles/remove', 
  authenticateToken, 
  requirePermission('roles:write'), 
  doc.create('/rbac/roles/remove', 'Remove role from user', ['RBAC']),
  assignRoleValidation, 
  RBACController.removeRoleFromUser);

router.get('/roles/:userId', 
  authenticateToken, 
  requirePermission('roles:read'), 
  doc.getById('/rbac/roles/{userId}', 'Get user roles', ['RBAC']),
  RBACController.getUserRoles);

router.get('/roles/check/:userId/:role', 
  authenticateToken, 
  requirePermission('roles:read'), 
  doc.getById('/rbac/roles/check/{userId}/{role}', 'Check if user has specific role', ['RBAC']),
  RBACController.checkUserRole);

router.get('/roles/users/:role', 
  authenticateToken, 
  requirePermission('roles:read'), 
  doc.getById('/rbac/roles/users/{role}', 'Get all users with specific role', ['RBAC']),
  RBACController.getUsersWithRole);

// Permission management routes
router.post('/permissions', 
  authenticateToken, 
  requirePermission('permissions:write'), 
  doc.create('/rbac/permissions', 'Create a new permission', ['RBAC']),
  createPermissionValidation, 
  RBACController.createPermission);

router.get('/permissions', 
  authenticateToken, 
  requirePermission('permissions:read'), 
  doc.getList('/rbac/permissions', 'Get all permissions', ['RBAC']),
  RBACController.getAllPermissions);

router.post('/permissions/assign', 
  authenticateToken, 
  requirePermission('permissions:write'), 
  doc.create('/rbac/permissions/assign', 'Assign permission to role', ['RBAC']),
  assignPermissionValidation, 
  RBACController.assignPermissionToRole);

router.post('/permissions/remove', 
  authenticateToken, 
  requirePermission('permissions:write'), 
  doc.create('/rbac/permissions/remove', 'Remove permission from role', ['RBAC']),
  assignPermissionValidation, 
  RBACController.removePermissionFromRole);

router.get('/permissions/:userId', 
  authenticateToken, 
  requirePermission('permissions:read'), 
  doc.getById('/rbac/permissions/{userId}', 'Get user permissions', ['RBAC']),
  RBACController.getUserPermissions);

router.get('/permissions/check/:userId/:permission', 
  authenticateToken, 
  requirePermission('permissions:read'), 
  doc.getById('/rbac/permissions/check/{userId}/{permission}', 'Check if user has specific permission', ['RBAC']),
  RBACController.checkUserPermission);

// User RBAC management
router.get('/users/:userId/sync', 
  authenticateToken, 
  requirePermission('users:read'), 
  doc.getById('/rbac/users/{userId}/sync', 'Sync user RBAC data', ['RBAC']),
  RBACController.syncUserRBAC);

// Initialize default roles and permissions (admin only)
router.post('/initialize', 
  authenticateToken, 
  requirePermission('roles:write'), 
  doc.create('/rbac/initialize', 'Initialize default roles and permissions', ['RBAC']),
  RBACController.initializeDefaults);

// Debug endpoint to check current user's roles and permissions
router.get('/debug/current-user', 
  authenticateToken, 
  doc.getById('/rbac/debug/current-user', 'Get current user roles and permissions (debug)', ['RBAC']),
  async (req, res) => {
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
router.get('/debug/session', 
  doc.getById('/rbac/debug/session', 'Check session status (debug)', ['RBAC']),
  async (req, res) => {
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
router.post('/debug/assign-role', 
  doc.create('/rbac/debug/assign-role', 'Assign role to user (debug)', ['RBAC']),
  async (req, res) => {
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
