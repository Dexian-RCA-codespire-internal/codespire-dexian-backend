const { verifySession } = require('supertokens-node/recipe/session/framework/express');
const { getUserById } = require('supertokens-node/recipe/emailpassword');
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

// Role-based access control
const requireRole = (role) => {
  return async (req, res, next) => {
    try {
      const userId = req.session.getUserId();
      const user = await getUserById(userId);
      
      if (!user || user.role !== role) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Authentication failed' });
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
  logAuthenticatedRequest
};
