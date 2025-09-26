# RBAC SuperTokens Integration Guide

## Overview

This document describes the comprehensive Role-Based Access Control (RBAC) system integrated with SuperTokens for user authentication and authorization.

## Architecture

The RBAC system uses a hybrid approach:
- **SuperTokens**: Handles authentication, session management, and role/permission storage
- **MongoDB**: Stores extended user information and syncs with SuperTokens
- **Express Middleware**: Provides role and permission-based route protection

## Components

### 1. SuperTokens Configuration

**File**: `src/config/supertokens.js`

- Integrated `UserRoles` and `UserPermissions` recipes
- Automatic role synchronization with MongoDB
- Custom role assignment and removal handlers

### 2. RBAC Service

**File**: `src/services/rbacService.js`

Core service providing:
- Role and permission management
- User role assignment/removal
- Permission checking
- Default roles and permissions initialization

### 3. User Model Updates

**File**: `src/models/User.js`

Enhanced with:
- Multiple roles support (`roles` array)
- Permissions array
- SuperTokens synchronization methods
- Role and permission checking methods

### 4. Authentication Middleware

**File**: `src/middleware/auth.js`

Enhanced with:
- `requireRole(role)` - Single role requirement
- `requirePermission(permission)` - Single permission requirement
- `requireAnyRole(roles)` - Multiple roles (OR logic)
- `requireAnyPermission(permissions)` - Multiple permissions (OR logic)

### 5. RBAC Controller & Routes

**Files**: 
- `src/controllers/rbacController.js`
- `src/routes/rbac.js`

Provides comprehensive API endpoints for role and permission management.

## Default Roles and Permissions

### Roles
- **admin**: Full system access
- **user**: Standard user access

### Permissions
- `users:read`, `users:write`, `users:delete`
- `roles:read`, `roles:write`, `roles:delete`
- `permissions:read`, `permissions:write`, `permissions:delete`
- `tickets:read`, `tickets:write`, `tickets:delete`
- `sla:read`, `sla:write`, `sla:delete`
- `dashboard:read`, `dashboard:write`
- `playbooks:read`, `playbooks:write`, `playbooks:delete`

## API Endpoints

### Role Management
```
POST   /api/v1/rbac/roles                    # Create role
GET    /api/v1/rbac/roles                    # Get all roles
POST   /api/v1/rbac/roles/assign              # Assign role to user
POST   /api/v1/rbac/roles/remove              # Remove role from user
GET    /api/v1/rbac/roles/:userId             # Get user roles
GET    /api/v1/rbac/roles/check/:userId/:role # Check if user has role
GET    /api/v1/rbac/roles/users/:role        # Get users with role
```

### Permission Management
```
POST   /api/v1/rbac/permissions                    # Create permission
GET    /api/v1/rbac/permissions                    # Get all permissions
POST   /api/v1/rbac/permissions/assign             # Assign permission to role
POST   /api/v1/rbac/permissions/remove             # Remove permission from role
GET    /api/v1/rbac/permissions/:userId            # Get user permissions
GET    /api/v1/rbac/permissions/check/:userId/:permission # Check user permission
```

### User RBAC Management
```
GET    /api/v1/rbac/users/:userId/sync             # Sync user RBAC from SuperTokens
POST   /api/v1/rbac/initialize                     # Initialize default roles/permissions
```

## Usage Examples

### 1. Protecting Routes with Roles

```javascript
const { requireRole, requirePermission } = require('../middleware/auth');

// Admin only route
router.get('/admin', requireRole('admin'), controller.adminOnly);

// Permission-based protection
router.get('/users', requirePermission('users:read'), controller.getUsers);
```

### 2. Creating and Assigning Roles

```javascript
const RBACService = require('../services/rbacService');

// Create a new role with permissions
await RBACService.createRole('editor', [
  'tickets:read',
  'tickets:write',
  'dashboard:read'
]);

// Assign role to user
await RBACService.assignRoleToUser(userId, 'editor');
```

### 3. Checking User Permissions

```javascript
// Check if user has specific role
const hasRole = await RBACService.userHasRole(userId, 'admin');

// Check if user has specific permission
const hasPermission = await RBACService.userHasPermission(userId, 'users:write');
```

### 4. User Model RBAC Methods

```javascript
const user = await User.findBySupertokensUserId(userId);

// Sync roles and permissions from SuperTokens
await user.syncRolesFromSuperTokens();
await user.syncPermissionsFromSuperTokens();

// Check roles and permissions
const isAdmin = user.hasRole('admin');
const canWrite = user.hasPermission('tickets:write');
const hasAnyRole = user.hasAnyRole(['admin', 'user']);

// Access roles array directly
const userRoles = user.roles; // ['user', 'admin'] or ['user']
const isAdminDirect = user.roles.includes('admin');
```

## Initialization

### 1. Initialize Default Roles and Permissions

```bash
POST /api/v1/rbac/initialize
```

This endpoint creates the default roles and permissions system.

### 2. Assign Initial Admin Role

After user registration, assign admin role:

```javascript
const RBACService = require('../services/rbacService');
await RBACService.assignRoleToUser(adminUserId, 'admin');
```

## Security Features

### 1. SuperTokens Integration
- All roles and permissions stored in SuperTokens
- Automatic session management
- Secure token handling

### 2. MongoDB Synchronization
- Local user data synchronized with SuperTokens
- Fallback role checking from local database
- Audit trail for role changes

### 3. Middleware Protection
- Route-level access control
- Granular permission checking
- Multiple role/permission support

## Migration from Hardcoded Roles

### Before (Hardcoded)
```javascript
role: {
  type: String,
  enum: ['user', 'admin'],
  default: 'user'
}
```

### After (SuperTokens Integration)
```javascript
roles: [{
  type: String,
  enum: ['user', 'admin'],
  default: ['user']
}],
permissions: [{
  type: String
}]
```

## Best Practices

### 1. Role Design
- Use descriptive role names
- Follow principle of least privilege
- Group related permissions

### 2. Permission Naming
- Use format: `resource:action`
- Examples: `users:read`, `tickets:write`, `reports:delete`

### 3. Middleware Usage
- Use specific permissions when possible
- Combine roles and permissions for complex access control
- Always validate on both frontend and backend

### 4. User Experience
- Sync user roles/permissions on login
- Provide clear error messages for access denied
- Implement role-based UI components

## Troubleshooting

### Common Issues

1. **Role not syncing**: Check SuperTokens configuration and MongoDB connection
2. **Permission denied**: Verify user has required role/permission in SuperTokens
3. **Session issues**: Ensure SuperTokens session is valid and not expired

### Debug Commands

```javascript
// Check user roles in SuperTokens
const roles = await UserRoles.getRolesForUser(userId);

// Check user permissions in SuperTokens
const permissions = await UserRoles.getPermissionsForUser(userId);

// Sync user data from SuperTokens
await user.syncRolesFromSuperTokens();
await user.syncPermissionsFromSuperTokens();
```

## Future Enhancements

1. **Dynamic Role Assignment**: Based on user attributes or conditions
2. **Role Hierarchies**: Parent-child role relationships
3. **Temporary Permissions**: Time-limited access grants
4. **Audit Logging**: Track all role and permission changes
5. **Bulk Operations**: Mass role/permission assignments

## Support

For issues or questions regarding the RBAC system:
1. Check SuperTokens documentation
2. Review middleware logs
3. Verify MongoDB synchronization
4. Test with SuperTokens dashboard
