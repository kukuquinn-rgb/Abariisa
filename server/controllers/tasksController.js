const Task = require('../models/Task');
const TrustScore = require('../models/TrustScore');
const Notification = require('../models/Notification');
const SystemConfig = require('../models/SystemConfig');

const DEFAULT_THRESHOLDS = {
  blockHighPriorityBelow: 40,
  flagHighRisk: 50,
  flagMediumRisk: 70
};

const getThresholds = async () => {
  const config = await SystemConfig.findOne({ key: 'trust_thresholds' });
  const configuredValue = config?.value && typeof config.value === 'object' ? config.value : {};
  return { ...DEFAULT_THRESHOLDS, ...configuredValue };
};

// Helper: recalculate trust score after task event
const recalculateTrustScore = async (workerId) => {
  const trustScore = await TrustScore.findOne({ worker: workerId });
  if (!trustScore) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTasks = await Task.find({
    assignedTo: workerId,
    createdAt: { $gte: thirtyDaysAgo }
  });

  if (recentTasks.length === 0) return;

  const completed = recentTasks.filter((t) => t.status === 'Completed');
  const onTime = completed.filter((t) => t.completedAt && t.completedAt <= t.dueDate);

  trustScore.taskCompletionScore = Math.round((completed.length / recentTasks.length) * 100);
  trustScore.punctualityScore = completed.length > 0
    ? Math.round((onTime.length / completed.length) * 100)
    : 100;

  trustScore.recalculate();
  await trustScore.save();
  return trustScore;
};

// @desc   Get all tasks
// @route  GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo, riskFlag } = req.query;
    const filter = {};

    if (req.user.role === 'worker') filter.assignedTo = req.user.id;
    if (assignedTo && req.user.role !== 'worker') filter.assignedTo = assignedTo;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (riskFlag) filter.riskFlag = riskFlag;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email trustScore')
      .populate('assignedBy', 'name')
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get single task
// @route  GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create task
// @route  POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { assignedTo, priority } = req.body;
    const thresholds = await getThresholds();
    let riskFlag = null;

    if (priority === 'High') {
      const ts = await TrustScore.findOne({ worker: assignedTo });
      const workerScore = ts?.overallScore ?? 100;

      if (workerScore < thresholds.blockHighPriorityBelow) {
        return res.status(403).json({
          message: `Cannot assign high-priority task. Worker Trust Score (${workerScore}%) is below the minimum threshold of ${thresholds.blockHighPriorityBelow}% for this action.`,
          blocked: true,
          workerScore,
          threshold: thresholds.blockHighPriorityBelow
        });
      }

      riskFlag = workerScore < thresholds.flagHighRisk
        ? 'High'
        : workerScore < thresholds.flagMediumRisk
          ? 'Medium'
          : 'Low';
    } else if (priority === 'Medium') {
      const ts = await TrustScore.findOne({ worker: assignedTo });
      const workerScore = ts?.overallScore ?? 100;
      riskFlag = workerScore < thresholds.flagHighRisk ? 'Medium' : null;
    }

    const task = await Task.create({ ...req.body, assignedBy: req.user.id, riskFlag });

    await Notification.create({
      recipient: assignedTo,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned: "${task.title}" — due ${new Date(task.dueDate).toLocaleDateString()}`,
      relatedTask: task._id
    });

    if (riskFlag === 'High' || riskFlag === 'Medium') {
      const workerScore = (await TrustScore.findOne({ worker: assignedTo }))?.overallScore ?? 'N/A';
      await Notification.create({
        recipient: req.user.id,
        type: 'risk_alert',
        title: `${riskFlag} Risk Task Flagged`,
        message: `Task "${task.title}" was flagged as ${riskFlag.toLowerCase()} risk for worker ${assignedTo}. Current trust score: ${workerScore}%.`,
        relatedTask: task._id,
        relatedWorker: assignedTo
      });
    }

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'assignedBy', select: 'name' }
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update task status
// @route  PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role === 'worker' && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorised to update this task' });
    }

    if (req.body.status === 'Completed' && task.status !== 'Completed') {
      req.body.completedAt = new Date();
    }

    Object.assign(task, req.body);
    await task.save();

    if (['Completed', 'Overdue'].includes(task.status)) {
      await recalculateTrustScore(task.assignedTo);

      const managerId = task.assignedBy;
      await Notification.create({
        recipient: managerId,
        type: 'task_updated',
        title: `Task ${task.status}`,
        message: `Task "${task.title}" was marked as ${task.status}.`,
        relatedTask: task._id,
        relatedWorker: task.assignedTo
      });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Delete task
// @route  DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Dashboard stats for tasks
// @route  GET /api/tasks/stats
const getTaskStats = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const filter = req.user.role === 'worker'
      ? { assignedTo: new mongoose.Types.ObjectId(req.user.id) }
      : {};
    const stats = await Task.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get risk summary
// @route  GET /api/tasks/risk-summary
const getRiskSummary = async (req, res) => {
  try {
    const riskTasks = await Task.find({
      status: { $ne: 'Completed' },
      riskFlag: { $in: ['High', 'Medium'] }
    })
      .populate('assignedTo', 'name trustScore')
      .populate('assignedBy', 'name')
      .sort({ riskFlag: 1, dueDate: 1 })
      .limit(10);

    const riskCountsRaw = await Task.aggregate([
      { $match: { status: { $ne: 'Completed' }, riskFlag: { $in: ['High', 'Medium', 'Low'] } } },
      { $group: { _id: '$riskFlag', count: { $sum: 1 } } }
    ]);

    const riskCounts = { High: 0, Medium: 0, Low: 0 };
    riskCountsRaw.forEach((item) => {
      if (riskCounts[item._id] !== undefined) {
        riskCounts[item._id] = item.count;
      }
    });

    res.json({ riskTasks, riskCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get thresholds
// @route  GET /api/tasks/thresholds
const getThresholdsRoute = async (req, res) => {
  try {
    res.json(await getThresholds());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update thresholds
// @route  PUT /api/tasks/thresholds
const updateThresholds = async (req, res) => {
  try {
    const { blockHighPriorityBelow, flagHighRisk, flagMediumRisk } = req.body;
    const values = [blockHighPriorityBelow, flagHighRisk, flagMediumRisk];

    if (values.some((value) => value === undefined || value === null)) {
      return res.status(400).json({ message: 'All threshold fields are required.' });
    }

    const nextThresholds = {
      blockHighPriorityBelow: Number(blockHighPriorityBelow),
      flagHighRisk: Number(flagHighRisk),
      flagMediumRisk: Number(flagMediumRisk)
    };

    const invalid = Object.values(nextThresholds).some(
      (value) => !Number.isFinite(value) || value < 0 || value > 100
    );
    if (invalid) {
      return res.status(400).json({ message: 'Threshold values must be numbers between 0 and 100.' });
    }

    const config = await SystemConfig.findOneAndUpdate(
      { key: 'trust_thresholds' },
      {
        key: 'trust_thresholds',
        value: nextThresholds,
        updatedBy: req.user.id,
        description: 'Trust score thresholds'
      },
      { upsert: true, new: true }
    );

    res.json({ thresholds: config.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get task completion trends for last 7 days
// @route  GET /api/tasks/trends
const getTaskTrends = async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    const filter = req.user.role === 'worker'
      ? { assignedTo: req.user.id }
      : {};

    const results = await Promise.all(
      days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const [completed, overdue, pending] = await Promise.all([
          Task.countDocuments({
            ...filter,
            status: 'Completed',
            completedAt: { $gte: day, $lt: nextDay }
          }),
          Task.countDocuments({
            ...filter,
            status: 'Overdue',
            dueDate: { $gte: day, $lt: nextDay }
          }),
          Task.countDocuments({
            ...filter,
            status: { $in: ['Pending', 'In Progress'] },
            dueDate: { $gte: day, $lt: nextDay }
          }),
        ]);

        return {
          date: day.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          }),
          Completed: completed,
          Overdue: overdue,
          Pending: pending,
        };
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  getRiskSummary,
  getThresholdsRoute,
  updateThresholds,
  getTaskTrends,
};