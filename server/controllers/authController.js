const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const TrustScore = require('../models/TrustScore');
const Invite = require('../models/Invite');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const createRandomPassword = () => crypto.randomBytes(24).toString('hex');

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

// @desc   Google sign-in / sign-up
// @route  POST /api/auth/google
// @access Public
const google = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google OAuth is not configured on the server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ message: 'Google account email is required' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split('@')[0],
        email,
        password: createRandomPassword(),
        role: 'worker',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated. Contact your administrator.' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, viewOnly: !!user.viewOnly },
    });
  } catch (err) {
    console.error('Google login failed:', err.message);
    res.status(500).json({ message: 'Google sign-in failed. Please try again.' });
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

module.exports = { register, login, getMe, google };
