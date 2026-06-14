const Task = require('../models/Task');
const TrustScore = require('../models/TrustScore');
const Notification = require('../models/Notification');

// Helper: recalculate trust score after task event
const recalculateTrustScore = async (workerId) => {
  let trustScore = await TrustScore.findOne({ worker: workerId });
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

    // Workers can only see their own tasks
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
    // Check worker trust score before assigning high-priority task
    const { assignedTo, priority } = req.body;
    if (priority === 'High') {
      const ts = await TrustScore.findOne({ worker: assignedTo });
      if (ts && ts.overallScore < 50) {
        req.body.riskFlag = 'High';
      } else if (ts && ts.overallScore < 70) {
        req.body.riskFlag = 'Medium';
      }
    }

    const task = await Task.create({ ...req.body, assignedBy: req.user.id });

    // Notify the assigned worker
    await Notification.create({
      recipient: assignedTo,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned: "${task.title}" — due ${new Date(task.dueDate).toLocaleDateString()}`,
      relatedTask: task._id
    });

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

    // Workers can only update their own tasks
    if (req.user.role === 'worker' && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorised to update this task' });
    }

    // Mark completion time
    if (req.body.status === 'Completed' && task.status !== 'Completed') {
      req.body.completedAt = new Date();
    }

    Object.assign(task, req.body);
    await task.save();

    // Recalculate trust score when a task is completed or marked overdue
    if (['Completed', 'Overdue'].includes(task.status)) {
      await recalculateTrustScore(task.assignedTo);

      // Notify the manager
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
    const filter = req.user.role === 'worker' ? { assignedTo: req.user.id } : {};
    const stats = await Task.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, getTaskStats };
