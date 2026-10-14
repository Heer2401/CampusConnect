const jwt = require('jsonwebtoken');

const generateToken = (userId, role = 'User') => {
  return jwt.sign(
    { id: userId.toString(), role },
    process.env.JWT_SECRET || 'campusconnect_jwt_secret',
    { expiresIn: '1h' }
  );
};

module.exports = {
  generateToken,
};
