const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TrustScore = require('../models/TrustScore');
const Invite = require('../models/Invite');

// Generate JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, position, department, inviteCode } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    let invite = null;
    if (inviteCode) {
      invite = await Invite.findOne({ code: inviteCode, used: false });
      if (!invite) return res.status(400).json({ message: 'Invalid or used invite code' });
      if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(400).json({ message: 'Invite has expired' });
      if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ message: 'This invite code is reserved for a different email address' });
      }
    }

    // If invite present, override role/viewOnly/invitedBy
    const newUserData = { name, email, password, role, phone, position, department };
    if (invite) {
      newUserData.role = invite.role || 'manager';
      newUserData.viewOnly = !!invite.viewOnly;
      newUserData.invitedBy = invite.invitedBy;
    }

    const user = await User.create(newUserData);

    // Create a TrustScore document for workers
    if (user.role === 'worker') {
      const trustScore = await TrustScore.create({ worker: user._id });
      user.trustScore = trustScore._id;
      await user.save();
    }

    if (invite) {
      invite.used = true;
      invite.usedBy = user._id;
      await invite.save();
    }

    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, viewOnly: !!user.viewOnly } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated. Contact your administrator.' });
    }

    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, viewOnly: !!user.viewOnly } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get current logged-in user
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('trustScore');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, getMe };
