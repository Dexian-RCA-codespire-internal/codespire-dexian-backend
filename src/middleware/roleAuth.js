const { verifySession } = require('supertokens-node/recipe/session/framework/express');

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
        const userRole = session.getAccessTokenPayload().role;
        
        console.log(`🔐 Role check - Required: [${roles.join(', ')}], User has: ${userRole}`);
        
        if (!roles.includes(userRole)) {
          console.log(`❌ Access denied - User role '${userRole}' not in required roles: [${roles.join(', ')}]`);
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            message: `Access denied. Required role(s): ${roles.join(' or ')}`,
            userRole: userRole
          });
        }
        
        console.log(`✅ Access granted - User role '${userRole}' is authorized`);
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
      const userRole = session.getAccessTokenPayload().role;
      const userEmail = session.getAccessTokenPayload().email;
      const userName = session.getAccessTokenPayload().name;
      
      req.userRole = userRole;
      req.userEmail = userEmail;
      req.userName = userName;
      
      console.log(`👤 User info - Role: ${userRole}, Email: ${userEmail}, Name: ${userName}`);
      next();
    } catch (error) {
      console.error('❌ Get user role error:', error);
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
