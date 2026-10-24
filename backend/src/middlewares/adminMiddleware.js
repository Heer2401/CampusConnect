const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'Administrator' || req.user.role === 'Admin')) {
    next();
  } else {
    res.status(403).json({
      message: 'Access denied: Administrator permissions required'
    });
  }
};

module.exports = { adminOnly };
