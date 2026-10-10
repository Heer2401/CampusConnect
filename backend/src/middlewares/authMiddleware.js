const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Handle "Bearer <token>" or accidental "Bearer Bearer <token>"
      const parts = req.headers.authorization.trim().split(/\s+/);
      token = parts[parts.length - 1];

      const primarySecret = process.env.JWT_SECRET || 'your_jwt_secret_here';
      let decoded;
      try {
        decoded = jwt.verify(token, primarySecret);
      } catch (err) {
        // Fallback for cases where server started before .env was created
        decoded = jwt.verify(token, 'campusconnect_jwt_secret');
      }

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found for this token' });
      }

      return next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ message: `Not authorized, token failed: ${error.message}` });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
