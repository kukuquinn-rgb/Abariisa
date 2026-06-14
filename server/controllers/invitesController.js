const Invite = require('../models/Invite');
const User = require('../models/User');

// @desc   Create an invite (manager/admin)
// @route  POST /api/invites
const createInvite = async (req, res) => {
  try {
    const { email } = req.body;
    const code = Invite.generateCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await Invite.create({ code, invitedBy: req.user._id, email, expiresAt });
    res.status(201).json({ code: invite.code, expiresAt: invite.expiresAt, email: invite.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get my invites
// @route  GET /api/invites
const getMyInvites = async (req, res) => {
  try {
    const invites = await Invite.find({ invitedBy: req.user._id }).populate('usedBy', 'name email').sort({ createdAt: -1 });
    res.json(invites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Revoke invite
// @route  DELETE /api/invites/:id
const revokeInvite = async (req, res) => {
  try {
    const invite = await Invite.findOne({ _id: req.params.id, invitedBy: req.user._id });
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (invite.used) return res.status(400).json({ message: 'Invite already used' });
    await invite.remove();
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
    const inviter = await User.findById(invite.invitedBy).select('name');
    res.json({ valid: true, invitedByName: inviter ? inviter.name : null, email: invite.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createInvite, getMyInvites, revokeInvite, validateInvite };
