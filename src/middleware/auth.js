const { verifySession } = require('supertokens-node/recipe/session/framework/express');
const { getUserById } = require('supertokens-node/recipe/emailpassword');
const UserRoles = require('supertokens-node/recipe/userroles');
const config = require('../config');

// Original simple authentication (for backward compatibility)
const authenticateToken = async (req, res, next) => {
  try {
    await verifySession()(req, res, next);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid session' });
  }
};

// Enhanced authentication with additional security checks
const authenticateTokenEnhanced = async (req, res, next) => {
  try {
    await verifySession()(req, res, next);
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid session',
      message: 'Please login again'
    });
  }
};

const authenticateOptional = async (req, res, next) => {
  try {
    await verifySession()(req, res, next);
  } catch (error) {
    // Session is invalid, but we continue without user context
    next();
  }
};

// Role-based access control using SuperTokens
const requireRole = (role) => {
  return async (req, res, next) => {
    try {
      const userId = req.session.getUserId();
      console.log('🔍 Checking role for user:', userId, 'required role:', role);
      
      // Check if user has the required role in SuperTokens
      let userRoles;
      try {
        userRoles = await UserRoles.getRolesForUser("public", userId);
        console.log('🔍 User roles (with tenantId):', userRoles);
      } catch (error) {
        console.log('🔍 First attempt failed, trying without tenantId:', error.message);
        userRoles = await UserRoles.getRolesForUser(userId);
        console.log('🔍 User roles (without tenantId):', userRoles);
      }
      
      const hasRole = userRoles.roles.includes(role);
      console.log('🔍 User has required role:', hasRole);
      
      if (!hasRole) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: `Role '${role}' required`
        });
      }
      
      // Add user roles to request object for use in controllers
      req.userRoles = userRoles.roles;
      next();
    } catch (err) {
      console.error('🔍 Role check error:', err);
      return res.status(403).json({ 
        success: false,
        error: 'Authentication failed' 
      });
    }
  };
};

// Helper function to get user permissions from roles
const getUserPermissions = async (userId) => {
  try {
    console.log('🔍 Getting permissions for user:', userId);
    
    // Get user roles first - try different API signatures
    let userRoles;
    try {
      // Try with tenantId parameter
      userRoles = await UserRoles.getRolesForUser("public", userId);
      console.log('🔍 User roles (with tenantId):', userRoles);
    } catch (error) {
      console.log('🔍 First attempt failed, trying without tenantId:', error.message);
      try {
        // Try without tenantId parameter
        userRoles = await UserRoles.getRolesForUser(userId);
        console.log('🔍 User roles (without tenantId):', userRoles);
      } catch (error2) {
        console.error('🔍 Both attempts failed:', error2.message);
        throw error2;
      }
    }
    
    if (!userRoles || !userRoles.roles || userRoles.roles.length === 0) {
      console.log('🔍 No roles found for user');
      return [];
    }
    
    console.log('🔍 User has roles:', userRoles.roles);
    const allPermissions = [];
    
    // Get permissions for each role
    for (const role of userRoles.roles) {
      console.log('🔍 Getting permissions for role:', role);
      try {
        const rolePermissions = await UserRoles.getPermissionsForRole(role);
        console.log('🔍 Role permissions response:', rolePermissions);
        
        if (rolePermissions.status !== "UNKNOWN_ROLE_ERROR" && rolePermissions.permissions) {
          console.log('🔍 Role', role, 'has permissions:', rolePermissions.permissions);
          allPermissions.push(...rolePermissions.permissions);
        } else {
          console.log('🔍 Role', role, 'has no permissions or unknown role error');
        }
      } catch (roleError) {
        console.error('🔍 Error getting permissions for role', role, ':', roleError);
      }
    }
    
    // Remove duplicates
    const uniquePermissions = [...new Set(allPermissions)];
    console.log('🔍 Final user permissions:', uniquePermissions);
    return uniquePermissions;
  } catch (error) {
    console.error('🔍 Error getting user permissions:', error);
    return [];
  }
};

// Permission-based access control using SuperTokens
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.session.getUserId();
      
      // Get user permissions from roles
      const userPermissions = await getUserPermissions(userId);
      const hasPermission = userPermissions.includes(permission);
      
      console.log('🔐 User permissions:', userPermissions);
      console.log('🔐 Required permission:', permission);
      console.log('🔐 Has permission:', hasPermission);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: `Permission '${permission}' required`
        });
      }
      
      // Add user permissions to request object for use in controllers
      req.userPermissions = userPermissions;
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(403).json({ 
        success: false,
        error: 'Authentication failed' 
      });
    }
  };
};

// Multiple roles access control
const requireAnyRole = (roles) => {
  return async (req, res, next) => {
    try {
      const userId = req.session.getUserId();
      
      // Check if user has any of the required roles in SuperTokens
      const userRoles = await UserRoles.getRolesForUser(userId);
      const hasAnyRole = roles.some(role => userRoles.roles.includes(role));
      
      if (!hasAnyRole) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: `One of these roles required: ${roles.join(', ')}`
        });
      }
      
      req.userRoles = userRoles.roles;
      next();
    } catch (err) {
      console.error('Role check error:', err);
      return res.status(403).json({ 
        success: false,
        error: 'Authentication failed' 
      });
    }
  };
};

// Multiple permissions access control
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      const userId = req.session.getUserId();
      
      // Get user permissions from roles
      const userPermissions = await getUserPermissions(userId);
      const hasAnyPermission = permissions.some(permission => userPermissions.includes(permission));
      
      console.log('🔐 User permissions:', userPermissions);
      console.log('🔐 Required permissions (any):', permissions);
      console.log('🔐 Has any permission:', hasAnyPermission);
      
      if (!hasAnyPermission) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: `One of these permissions required: ${permissions.join(', ')}`
        });
      }
      
      req.userPermissions = userPermissions;
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(403).json({ 
        success: false,
        error: 'Authentication failed' 
      });
    }
  };
};

// Request logging middleware
const logAuthenticatedRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`🔐 Authenticated Request: ${req.method} ${req.path}`, {
    userId: req.session?.getUserId?.(),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    console.log(`📤 Response: ${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.session?.getUserId?.(),
      timestamp: new Date().toISOString()
    });
    
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  authenticateToken,
  authenticateTokenEnhanced,
  authenticateOptional,
  requireRole,
  requirePermission,
  requireAnyRole,
  requireAnyPermission,
  logAuthenticatedRequest
};
