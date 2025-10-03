const { verifySession } = require('supertokens-node/recipe/session/framework/express');
const UserRoles = require('supertokens-node/recipe/userroles');

/**
 * Middleware to check if user has required role
 * @param {string|string[]} requiredRoles - Role(s) required to access the route
 * @returns {Function} Express middleware function
 */
const requireRole = (requiredRoles) => {
  // Convert single role to array for consistent handling
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return [
    // First verify the session
    verifySession(),
    
    // Then check the role
    async (req, res, next) => {
      try {
        const session = req.session;
        const userId = session.getUserId();
        
        // Get user roles from SuperTokens UserRoles recipe
        const userRolesResponse = await UserRoles.getRolesForUser("public", userId);
        const userRoles = userRolesResponse.roles || [];
        
        console.log(`🔐 Role check - Required: [${roles.join(', ')}], User has: [${userRoles.join(', ')}]`);
        
        // Check if user has any of the required roles
        const hasRequiredRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRequiredRole) {
          console.log(`❌ Access denied - User roles [${userRoles.join(', ')}] not in required roles: [${roles.join(', ')}]`);
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            message: `Access denied. Required role(s): ${roles.join(' or ')}`,
            userRoles: userRoles
          });
        }
        
        console.log(`✅ Access granted - User roles [${userRoles.join(', ')}] include required role`);
        next();
      } catch (error) {
        console.error('❌ Role check error:', error);
        return res.status(500).json({
          success: false,
          error: 'Role verification failed',
          message: 'Internal server error during role verification'
        });
      }
    }
  ];
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is admin or moderator
 */
const requireAdminOrModerator = requireRole(['admin', 'moderator']);

/**
 * Middleware to check if user is admin, moderator, or support
 */
const requireStaff = requireRole(['admin', 'moderator', 'support']);

/**
 * Middleware to get user role information (doesn't block access)
 */
const getUserRole = [
  verifySession(),
  async (req, res, next) => {
    try {
      const session = req.session;
      const userId = session.getUserId();
      
      // Get user roles from SuperTokens UserRoles recipe
      const userRolesResponse = await UserRoles.getRolesForUser("public", userId);
      const userRoles = userRolesResponse.roles || [];
      const userEmail = session.getAccessTokenPayload().email;
      const userName = session.getAccessTokenPayload().name;
      
      req.userRoles = userRoles;
      req.userRole = userRoles[0] || null; // For backward compatibility
      req.userEmail = userEmail;
      req.userName = userName;
      
      console.log(`👤 User info - Roles: [${userRoles.join(', ')}], Email: ${userEmail}, Name: ${userName}`);
      next();
    } catch (error) {
      console.error('❌ Get user role error:', error);
      req.userRoles = [];
      req.userRole = null;
      req.userEmail = null;
      req.userName = null;
      next();
    }
  }
];

module.exports = {
  requireRole,
  requireAdmin,
  requireAdminOrModerator,
  requireStaff,
  getUserRole
};
