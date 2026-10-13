const WorkPlan = require('../models/WorkPlan');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const User = require('../models/User');
const { farmScope, requireFarmId } = require('../middleware/auth');

const createWorkPlan = async (req, res) => {
  try {
    const farm = requireFarmId(req, res);
    if (!farm) return;
    const { assignedTo } = req.body;
    const worker = mongoose.isValidObjectId(assignedTo)
      ? await User.findOne({ _id: assignedTo, farm })
      : null;
    if (!worker) return res.status(400).json({ message: 'Assigned worker not found on this farm' });

    // farm is set after the spread so it can't be supplied from the body.
    const plan = await WorkPlan.create({ ...req.body, farm, createdBy: req.user.id });

    if (worker) {
      await Notification.create({
        farm,
        recipient: worker._id,
        type: 'task_assigned',
        title: 'New Work Plan',
        message: `A work plan has been created for you for ${new Date(req.body.date).toLocaleDateString()}.`
      });
    }

    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getWorkPlans = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { ...farmScope(req), ...(date ? { date: new Date(date) } : {}) };

    if (req.user.role === 'worker') {
      filter.assignedTo = req.user.id;
    }

    const plans = await WorkPlan.find(filter)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .sort({ date: 1 });

    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateActivity = async (req, res) => {
  try {
    const plan = await WorkPlan.findOne({ _id: req.params.planId, ...farmScope(req) });
    if (!plan) return res.status(404).json({ message: 'Work plan not found' });

    const activity = plan.activities.id(req.params.activityId);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    activity.status = req.body.status || activity.status;
    activity.workerNotes = req.body.workerNotes ?? activity.workerNotes;
    activity.completedAt = req.body.status === 'Completed' ? new Date() : activity.completedAt;

    if (req.body.leakPoint) {
      const worker = req.user;
      await Notification.create({
        farm: plan.farm,
        recipient: plan.createdBy,
        type: 'risk_alert',
        title: 'Leak Point Reported',
        message: `${worker?.name || 'A worker'} reported a leak point: ${req.body.leakPointDescription || 'No details provided'}`
      });
    }

    plan.overallStatus = plan.activities.every((item) => item.status === 'Completed')
      ? 'Completed'
      : plan.activities.some((item) => item.status === 'Completed')
        ? 'Partial'
        : 'Active';

    await plan.save();
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createWorkPlan, getWorkPlans, updateActivity };
