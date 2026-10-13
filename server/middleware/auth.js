const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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

// Tenant scoping — use after `protect`.
// Managers/workers: req.farmId = their farm (403 if they have none yet).
// Admins: platform-level, no farm. They may narrow to one farm with ?farm=<id>;
// without it req.farmId stays undefined and farmScope(req) returns {} (global view).
const scopeFarm = (req, res, next) => {
  if (req.user.role === 'admin') {
    const { farm } = req.query;
    if (farm) {
      if (!mongoose.isValidObjectId(farm)) return res.status(400).json({ message: 'Invalid farm id' });
      req.farmId = new mongoose.Types.ObjectId(String(farm));
    }
    return next();
  }
  if (!req.user.farm || req.user.needsOnboarding) {
    return res.status(403).json({ message: 'No farm linked to this account', needsOnboarding: true });
  }
  req.farmId = req.user.farm;
  next();
};

// Filter fragment for farm-owned queries: { farm } for farm users, {} for an unscoped admin.
const farmScope = (req) => (req.farmId ? { farm: req.farmId } : {});

// For creates: a record must belong to a farm. Admins must pick one with ?farm=<id>.
// Returns the farm id, or sends a 400 and returns null.
const requireFarmId = (req, res) => {
  if (req.farmId) return req.farmId;
  res.status(400).json({ message: 'Select a farm (?farm=<id>) to create farm records as an admin' });
  return null;
};

module.exports = { protect, authorise, blockViewOnly, scopeFarm, farmScope, requireFarmId };
