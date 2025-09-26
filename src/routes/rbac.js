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

module.exports = router;
