const { protect } = require('../../middlewares/authMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// TODO(auth): Swap requireAuth back to pure `protect` once auth module is fully merged and tested
const requireAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-user']) {
    try {
      req.user = JSON.parse(req.headers['x-dev-user']);
      return next();
    } catch (e) {
      console.error('Invalid x-dev-user header');
    }
  }
  return protect(req, res, next);
};

// Optional auth: checks token but doesn't block if missing/invalid
const optionalAuth = async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-user']) {
    try {
      req.user = JSON.parse(req.headers['x-dev-user']);
      return next();
    } catch (e) {}
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusconnect_jwt_secret');
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // ignore error for optional auth
    }
  }
  
  // Dev-only fallback
  if (!req.user && process.env.NODE_ENV !== 'production' && req.headers['x-dev-user']) {
    try {
      req.user = JSON.parse(req.headers['x-dev-user']);
    } catch (e) {}
  }
  
  next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    // Note: Dhrumil's admin role is 'Administrator', but let's map 'admin' to 'Administrator' for our usage
    const targetRole = role === 'admin' ? 'Administrator' : role;
    if (req.user && req.user.role === targetRole) {
      next();
    } else {
      res.status(403).json({ success: false, error: { code: 403, message: `Access denied: ${role} permissions required` } });
    }
  };
};

const getCurrentUser = (req) => req.user;

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  getCurrentUser,
};
