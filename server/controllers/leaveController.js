const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { farmScope, requireFarmId } = require('../middleware/auth');

const requestLeave = async (req, res) => {
  try {
    const farm = requireFarmId(req, res);
    if (!farm) return;
    // farm and worker are set after the spread so they can't be overridden from the body.
    const leave = await Leave.create({ ...req.body, worker: req.user.id, farm });

    const worker = req.user;
    const manager = await User.findOne({ farm, role: 'manager', isActive: true });

    if (manager) {
      await Notification.create({
        farm,
        recipient: manager._id,
        type: 'general',
        title: 'Leave Request',
        message: `${worker?.name || 'A worker'} has requested ${leave.days} days of ${leave.leaveType} leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}.`
      });
    }

    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyLeave = async (req, res) => {
  try {
    const leaves = await Leave.find({ ...farmScope(req), worker: req.user.id }).sort({ createdAt: -1 });
    const approvedAnnual = await Leave.find({ ...farmScope(req), worker: req.user.id, status: 'Approved', leaveType: 'Annual' });
    const usedDays = approvedAnnual.reduce((sum, item) => sum + (item.days || 0), 0);
    const totalAnnualDays = 21;
    const remainingDays = Math.max(totalAnnualDays - usedDays, 0);

    res.json({ leaves, totalAnnualDays, usedDays, remainingDays });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllLeave = async (req, res) => {
  try {
    const leaves = await Leave.find({ ...farmScope(req) }).populate('worker', 'name email').sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const respondToLeave = async (req, res) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, ...farmScope(req) });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    leave.status = req.body.status;
    leave.managerNotes = req.body.managerNotes;
    leave.approvedBy = req.user.id;
    leave.approvedAt = new Date();
    await leave.save();

    await Notification.create({
      farm: leave.farm,
      recipient: leave.worker,
      type: 'general',
      title: `Leave Request ${req.body.status}`,
      message: `Your leave request for ${leave.days} days has been ${req.body.status}.`
    });

    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { requestLeave, getMyLeave, getAllLeave, respondToLeave };
