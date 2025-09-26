const { verifySession } = require('supertokens-node/recipe/session/framework/express');
const { getUserById } = require('supertokens-node/recipe/emailpassword');
const { UserRoles } = require('supertokens-node/recipe/userroles');
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
      
      // Check if user has the required role in SuperTokens
      const userRoles = await UserRoles.getRolesForUser(userId);
      const hasRole = userRoles.roles.includes(role);
      
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
      console.error('Role check error:', err);
      return res.status(403).json({ 
        success: false,
        error: 'Authentication failed' 
      });
    }
  };
};

// Permission-based access control using SuperTokens
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.session.getUserId();
      
      // Check if user has the required permission in SuperTokens
      const userPermissions = await UserRoles.getPermissionsForUser(userId);
      const hasPermission = userPermissions.permissions.includes(permission);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: `Permission '${permission}' required`
        });
      }
      
      // Add user permissions to request object for use in controllers
      req.userPermissions = userPermissions.permissions;
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
      
      // Check if user has any of the required permissions in SuperTokens
      const userPermissions = await UserRoles.getPermissionsForUser(userId);
      const hasAnyPermission = permissions.some(permission => userPermissions.permissions.includes(permission));
      
      if (!hasAnyPermission) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: `One of these permissions required: ${permissions.join(', ')}`
        });
      }
      
      req.userPermissions = userPermissions.permissions;
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
