const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorised — no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorised — invalid token' });
  }
};

// Role-based access control
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Role '${req.user.role}' is not permitted.`
      });
    }
    next();
  };
};

// Block view-only users from making changes
const blockViewOnly = (req, res, next) => {
  if (req.user && req.user.viewOnly) {
    return res.status(403).json({ message: 'View-only accounts cannot make changes. Contact your farm manager to make this update.' });
  }
  next();
};

module.exports = { protect, authorise, blockViewOnly };
