const { verifySession } = require('supertokens-node/recipe/session/framework/express');
const { getUserById } = require('supertokens-node/recipe/emailpassword');
const config = require('../config');

const authenticateToken = async (req, res, next) => {
  try {
    await verifySession()(req, res, next);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid session' });
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

module.exports = {
  authenticateToken,
  authenticateOptional,
  requireRole
};
