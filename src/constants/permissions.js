// new file servicenow
/**
 * Permission Constants
 * Simple centralized definition of all system permissions
 */

// All available permissions in the system
const PERMISSIONS = {
  // User Management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',

  // Role Management
  ROLES_READ: 'roles:read',
  ROLES_WRITE: 'roles:write',
  ROLES_DELETE: 'roles:delete',

  // Permission Management
  PERMISSIONS_READ: 'permissions:read',
  PERMISSIONS_WRITE: 'permissions:write',
  PERMISSIONS_DELETE: 'permissions:delete',

  // Ticket Management
  TICKETS_READ: 'tickets:read',
  TICKETS_WRITE: 'tickets:write',
  TICKETS_DELETE: 'tickets:delete',

  // SLA Management
  SLA_READ: 'sla:read',
  SLA_WRITE: 'sla:write',
  SLA_DELETE: 'sla:delete',

  // Dashboard
  DASHBOARD_READ: 'dashboard:read',
  DASHBOARD_WRITE: 'dashboard:write',

  // Playbook Management
  PLAYBOOKS_READ: 'playbooks:read',
  PLAYBOOKS_WRITE: 'playbooks:write',
  PLAYBOOKS_DELETE: 'playbooks:delete'
};

// Array of all permissions
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// Role-based permission mappings
const ROLE_PERMISSIONS = {
  admin: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.ROLES_WRITE,
    PERMISSIONS.ROLES_DELETE,
    PERMISSIONS.PERMISSIONS_READ,
    PERMISSIONS.PERMISSIONS_WRITE,
    PERMISSIONS.PERMISSIONS_DELETE,
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_WRITE,
    PERMISSIONS.TICKETS_DELETE,
    PERMISSIONS.SLA_READ,
    PERMISSIONS.SLA_WRITE,
    PERMISSIONS.SLA_DELETE,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_WRITE,
    PERMISSIONS.PLAYBOOKS_READ,
    PERMISSIONS.PLAYBOOKS_WRITE,
    PERMISSIONS.PLAYBOOKS_DELETE
  ],
  user: [
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_WRITE,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.PLAYBOOKS_READ
  ]
};

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS
};
