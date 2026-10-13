const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Farm = require('../models/Farm');
const TrustScore = require('../models/TrustScore');
const Invite = require('../models/Invite');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const createRandomPassword = () => crypto.randomBytes(24).toString('hex');

// Shape of the user object returned by every auth endpoint.
// Includes both `id` and `_id` so client code using either keeps working.
const buildUserPayload = async (user) => {
  const farm = user.farm ? await Farm.findById(user.farm).select('name') : null;
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    viewOnly: !!user.viewOnly,
    farm: farm ? { id: farm._id, name: farm.name } : null,
    needsOnboarding: !!user.needsOnboarding
  };
};

const sendAuth = async (res, user, status = 200) => {
  const payload = await buildUserPayload(user);
  res.status(status).json({ token: signToken(user._id), user: payload, needsOnboarding: payload.needsOnboarding });
};

// Transactions need a replica set or sharded cluster (Atlas always is; a local standalone isn't).
let transactionsSupported;
const supportsTransactions = async () => {
  if (transactionsSupported === undefined) {
    try {
      const hello = await mongoose.connection.db.admin().command({ hello: 1 });
      transactionsSupported = !!(hello.setName || hello.msg === 'isdbgrid');
    } catch {
      transactionsSupported = false;
    }
  }
  return transactionsSupported;
};

// Creates a farm owned by `user` and links the user to it as its manager.
// `user` may be a new unsaved document or an existing one (Google onboarding).
// Uses a transaction where supported (Atlas); otherwise falls back to manual cleanup.
const createFarmWithOwner = async (user, { farmName, district, village, phone }, { userIsNew }) => {
  const farmId = new mongoose.Types.ObjectId();
  user.farm = farmId;
  user.role = 'manager';
  user.viewOnly = false;
  user.needsOnboarding = false;

  const farm = new Farm({ _id: farmId, name: farmName, district, village, phone, owner: user._id });

  // Validate both up front so the common failures (missing fields) touch nothing.
  await user.validate();
  await farm.validate();

  if (await supportsTransactions()) {
    // Single attempt, no automatic retry: a retried save would re-run the password-hash hook
    // on an already-hashed password. On failure the client simply submits again.
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await user.save({ session });
      await farm.save({ session });
      await session.commitTransaction();
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
    return user;
  }

  // No transaction support (e.g. standalone local MongoDB): save, and roll back by hand.
  await user.save();
  try {
    await farm.save();
  } catch (farmErr) {
    if (userIsNew) await User.deleteOne({ _id: user._id });
    else await User.updateOne({ _id: user._id }, { $unset: { farm: 1 }, $set: { needsOnboarding: true } });
    throw farmErr;
  }
  return user;
};

// Look up an invite code and check it can be used by `email`.
const findUsableInvite = async (code, email) => {
  const invite = await Invite.findOne({ code, used: false });
  if (!invite) return { error: 'Invalid or used invite code' };
  if (invite.expiresAt && invite.expiresAt < new Date()) return { error: 'Invite has expired' };
  if (invite.email && invite.email.toLowerCase() !== String(email || '').toLowerCase()) {
    return { error: 'This invite code is reserved for a different email address' };
  }
  const farm = await Farm.findOne({ _id: invite.farm, isActive: true }).select('_id');
  if (!farm) return { error: 'The farm for this invite is no longer active' };
  return { invite };
};

// Atomically mark an invite as used so two people can't redeem it at once.
const claimInvite = (invite, userId) =>
  Invite.findOneAndUpdate({ _id: invite._id, used: false }, { used: true, usedBy: userId }, { new: true });

const releaseInvite = (invite) =>
  Invite.updateOne({ _id: invite._id }, { used: false, usedBy: null });

// Apply an invite to a user (new or existing) and save them; creates a TrustScore for workers.
const joinFarmWithInvite = async (user, invite) => {
  user.farm = invite.farm;
  user.role = invite.role || 'manager';
  user.viewOnly = !!invite.viewOnly;
  user.invitedBy = invite.invitedBy;
  user.needsOnboarding = false;
  await user.save();

  if (user.role === 'worker' && !user.trustScore) {
    const trustScore = await TrustScore.create({ worker: user._id, farm: user.farm });
    user.trustScore = trustScore._id;
    await user.save();
  }
  return user;
};

// @desc   Register a new farm and its owner (manager)
// @route  POST /api/auth/register-farm
// @access Public
const registerFarm = async (req, res) => {
  try {
    const { farmName, district, village, name, email, password, phone } = req.body;

    if (!farmName || !String(farmName).trim()) {
      return res.status(400).json({ message: 'Farm name is required' });
    }

    const existingUser = await User.findOne({ email: String(email || '').toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({ name, email, password, phone });
    await createFarmWithOwner(user, { farmName, district, village, phone }, { userIsNew: true });

    await sendAuth(res, user, 201);
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
};

// @desc   Join an existing farm with an invite code
// @route  POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    // `role` is intentionally NOT read from the body — roles are only ever set server-side.
    const { name, email, password, phone, position, department, inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ message: 'An invite code is required to join a farm. To start your own farm, register a farm instead.' });
    }

    const existingUser = await User.findOne({ email: String(email || '').toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const { invite, error } = await findUsableInvite(inviteCode, email);
    if (error) return res.status(400).json({ message: error });

    const user = new User({ name, email, password, phone, position, department });
    // Validate before claiming the invite so a bad form doesn't burn the code.
    user.farm = invite.farm;
    user.role = invite.role || 'manager';
    await user.validate();

    if (!(await claimInvite(invite, user._id))) {
      return res.status(400).json({ message: 'Invalid or used invite code' });
    }

    try {
      await joinFarmWithInvite(user, invite);
    } catch (err) {
      await releaseInvite(invite);
      await User.deleteOne({ _id: user._id });
      throw err;
    }

    await sendAuth(res, user, 201);
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: err.message });
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

    await sendAuth(res, user);
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
      // New Google users have no farm yet: they must create one or enter an invite code
      // via POST /api/auth/onboard before they can see any farm data.
      user = await User.create({
        name: payload.name || payload.email.split('@')[0],
        email,
        password: createRandomPassword(),
        role: 'worker',
        needsOnboarding: true,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated. Contact your administrator.' });
    }

    await sendAuth(res, user);
  } catch (err) {
    console.error('Google login failed:', err.message);
    res.status(500).json({ message: 'Google sign-in failed. Please try again.' });
  }
};

// @desc   Finish onboarding for a user without a farm: create a farm or join one by invite
// @route  POST /api/auth/onboard
// @access Private
const onboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts are not linked to a farm' });
    }
    if (user.farm && !user.needsOnboarding) {
      return res.status(400).json({ message: 'This account is already linked to a farm' });
    }

    const { inviteCode, farmName, district, village, phone } = req.body;

    if (inviteCode) {
      const { invite, error } = await findUsableInvite(inviteCode, user.email);
      if (error) return res.status(400).json({ message: error });
      if (!(await claimInvite(invite, user._id))) {
        return res.status(400).json({ message: 'Invalid or used invite code' });
      }
      try {
        await joinFarmWithInvite(user, invite);
      } catch (err) {
        await releaseInvite(invite);
        throw err;
      }
    } else if (farmName && String(farmName).trim()) {
      if (phone) user.phone = phone;
      await createFarmWithOwner(user, { farmName, district, village, phone }, { userIsNew: false });
    } else {
      return res.status(400).json({ message: 'Provide either a farm name to create a farm, or an invite code' });
    }

    await sendAuth(res, user);
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
};

// @desc   Get current logged-in user
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('trustScore').populate('farm', 'name');
    const data = user.toObject();
    data.id = user._id;
    data.farm = user.farm ? { id: user.farm._id, name: user.farm.name } : null;
    data.needsOnboarding = !!user.needsOnboarding;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, registerFarm, login, getMe, google, onboard };
