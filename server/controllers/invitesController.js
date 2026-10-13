const Invite = require('../models/Invite');
const User = require('../models/User');
const Farm = require('../models/Farm');
const { farmScope } = require('../middleware/auth');

// Managers invite to their own farm (req.farmId from scopeFarm).
// Admins have no farm and must name one with ?farm=<id>.
const resolveInviteFarm = async (req) => {
  if (!req.farmId) return null;
  if (req.user.role !== 'admin') return req.farmId;
  const farm = await Farm.findById(req.farmId).select('_id');
  return farm ? farm._id : null;
};

// @desc   Create an invite (manager/admin)
// @route  POST /api/invites
// @body   { email?, role?: 'worker' | 'manager', viewOnly? }
const createInvite = async (req, res) => {
  try {
    const { email } = req.body;
    const role = req.body.role === 'worker' ? 'worker' : 'manager';
    // Workers are never view-only; manager invites default to view-only collaborators.
    const viewOnly = role === 'worker' ? false : req.body.viewOnly !== false;

    const farm = await resolveInviteFarm(req);
    if (!farm) {
      return res.status(400).json({ message: req.user.role === 'admin' ? 'Specify a valid farm (?farm=<id>) for this invite' : 'No farm linked to this account' });
    }

    const code = Invite.generateCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await Invite.create({ code, farm, invitedBy: req.user._id, email, role, viewOnly, expiresAt });
    res.status(201).json({
      _id: invite._id,
      code: invite.code,
      expiresAt: invite.expiresAt,
      email: invite.email,
      role: invite.role,
      viewOnly: invite.viewOnly
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get this farm's invites (admins: all, or ?farm=<id>)
// @route  GET /api/invites
const getMyInvites = async (req, res) => {
  try {
    const filter = { ...farmScope(req) };
    if (req.query.role) filter.role = req.query.role;
    const invites = await Invite.find(filter)
      .populate('usedBy', 'name email')
      .populate('invitedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(invites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Revoke invite
// @route  DELETE /api/invites/:id
const revokeInvite = async (req, res) => {
  try {
    const invite = await Invite.findOne({ _id: req.params.id, ...farmScope(req) });
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (invite.used) return res.status(400).json({ message: 'Invite already used' });
    await invite.deleteOne();
    res.json({ message: 'Invite revoked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Validate invite by code (public)
// @route  GET /api/invites/:code/validate
const validateInvite = async (req, res) => {
  try {
    const invite = await Invite.findOne({ code: req.params.code, used: false });
    if (!invite) return res.status(404).json({ message: 'Invite not found or already used' });
    if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(400).json({ message: 'Invite has expired' });
    const [inviter, farm] = await Promise.all([
      User.findById(invite.invitedBy).select('name'),
      Farm.findOne({ _id: invite.farm, isActive: true }).select('name')
    ]);
    if (!farm) return res.status(400).json({ message: 'The farm for this invite is no longer active' });
    res.json({
      valid: true,
      invitedByName: inviter ? inviter.name : null,
      email: invite.email,
      farmName: farm.name,
      role: invite.role,
      viewOnly: invite.viewOnly
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createInvite, getMyInvites, revokeInvite, validateInvite };
