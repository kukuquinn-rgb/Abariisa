const User = require('../models/User');
const TrustScore = require('../models/TrustScore');
const Farm = require('../models/Farm');
const { farmScope } = require('../middleware/auth');

// ---------------- Admin functions ----------------
// @desc   Get all users (admin only; optional ?farm=<id>)
// @route  GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const filter = { ...farmScope(req) };
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    const users = await User.find(filter).populate('trustScore').populate('farm', 'name').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Set user active/inactive (admin only)
// @route  PUT /api/users/:id/status
const setUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot change your own account status' });
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Set user role (admin only)
// @route  PUT /api/users/:id/role
const setUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['manager', 'worker', 'admin'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot change your own role' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (role !== 'admin' && !user.farm) {
      return res.status(400).json({ message: 'This user is not linked to a farm, so they cannot be a manager or worker' });
    }
    user.role = role;
    if (role === 'worker' && !user.trustScore) {
      const ts = await TrustScore.create({ worker: user._id, farm: user.farm });
      user.trustScore = ts._id;
    }
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Platform stats (admin only; optional ?farm=<id>)
// @route  GET /api/users/admin/stats
const getPlatformStats = async (req, res) => {
  try {
    const scope = farmScope(req);
    const totalUsers = await User.countDocuments(scope);
    const managers = await User.countDocuments({ ...scope, role: 'manager' });
    const workers = await User.countDocuments({ ...scope, role: 'worker' });
    const admins = await User.countDocuments({ ...scope, role: 'admin' });
    const activeUsers = await User.countDocuments({ ...scope, isActive: true });
    const inactiveUsers = await User.countDocuments({ ...scope, isActive: false });
    const recentUsers = await User.find(scope).select('name email role createdAt farm').populate('farm', 'name').sort({ createdAt: -1 }).limit(5);
    const totalFarms = await Farm.countDocuments();
    const activeFarms = await Farm.countDocuments({ isActive: true });
    res.json({ totalUsers, managers, workers, admins, activeUsers, inactiveUsers, recentUsers, totalFarms, activeFarms });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get all workers (manager only)
// @route  GET /api/users/workers
const getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ ...farmScope(req), role: 'worker', isActive: true })
      .populate('trustScore')
      .sort({ name: 1 });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get single user profile
// @route  GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, ...farmScope(req) }).populate('trustScore');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update user
// @route  PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { name, phone, position, department, isActive } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, ...farmScope(req) },
      { name, phone, position, department, isActive },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Deactivate worker
// @route  DELETE /api/users/:id
const deactivateUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, ...farmScope(req) }, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Worker account deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getWorkers, getUser, updateUser, deactivateUser, getAllUsers, setUserStatus, setUserRole, getPlatformStats };

