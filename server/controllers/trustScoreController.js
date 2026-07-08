const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const TrustScore = require('../models/TrustScore');
const User = require('../models/User');

const recalculateWorkerScore = async (workerId, managerId) => {
  const trustScore = await TrustScore.findOne({ worker: workerId });
  if (!trustScore) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const attendanceRecords = await Attendance.find({ worker: workerId, date: { $gte: thirtyDaysAgo } });
  const totalAttendance = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((record) => ['Present', 'Late'].includes(record.status)).length;
  const onTimeCount = attendanceRecords.filter((record) => record.status === 'Present').length;

  const attendanceScore = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;
  const punctualityScore = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 100;

  const taskRecords = await Task.find({ assignedTo: workerId, createdAt: { $gte: thirtyDaysAgo } });
  const totalTasks = taskRecords.length;
  const completedTasks = taskRecords.filter((record) => record.status === 'Completed').length;
  const overdueTasks = taskRecords.filter((record) => record.status === 'Overdue').length;

  const taskCompletionScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const responsivenessScore = totalTasks > 0 ? Math.max(0, 100 - Math.round((overdueTasks / totalTasks) * 100)) : 100;

  const recentWindow = await Task.find({
    assignedTo: workerId,
    createdAt: { $gte: fourteenDaysAgo }
  });
  const previousWindow = await Task.find({
    assignedTo: workerId,
    createdAt: { $lt: fourteenDaysAgo, $gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) }
  });

  const recentCompletionRate = recentWindow.length > 0 ? recentWindow.filter((record) => record.status === 'Completed').length / recentWindow.length : 1;
  const previousCompletionRate = previousWindow.length > 0 ? previousWindow.filter((record) => record.status === 'Completed').length / previousWindow.length : 1;
  const variance = Math.abs(recentCompletionRate - previousCompletionRate);
  const consistencyScore = Math.round((1 - variance) * 100);

  trustScore.attendanceScore = attendanceScore;
  trustScore.punctualityScore = punctualityScore;
  trustScore.taskCompletionScore = taskCompletionScore;
  trustScore.responsivenessScore = responsivenessScore;
  trustScore.consistencyScore = consistencyScore;
  trustScore.recalculate();
  await trustScore.save();

  if (managerId) {
    const previousScore = trustScore.history.length > 1 ? trustScore.history[trustScore.history.length - 2]?.score : trustScore.overallScore;
    if (Math.abs(trustScore.overallScore - previousScore) >= 10) {
      await Notification.create({
        recipient: managerId,
        type: 'trust_score_change',
        title: 'Trust Score Updated',
        message: `Worker trust score changed to ${trustScore.overallScore}%`,
        relatedWorker: workerId
      });
    }
  }

  return trustScore;
};

const recalculateOne = async (req, res) => {
  try {
    const trustScore = await recalculateWorkerScore(req.params.workerId, req.user.id);
    if (!trustScore) return res.status(404).json({ message: 'Trust score not found' });
    res.json(trustScore);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const recalculateAll = async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker', isActive: true });
    const results = [];
    for (const worker of workers) {
      const trustScore = await recalculateWorkerScore(worker._id, req.user.id);
      if (trustScore) results.push(trustScore);
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWorkerTrustScore = async (req, res) => {
  try {
    const trustScore = await TrustScore.findOne({ worker: req.params.workerId }).populate('worker', 'name email position department');
    if (!trustScore) return res.status(404).json({ message: 'Trust score not found' });
    res.json(trustScore);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllTrustScores = async (req, res) => {
  try {
    const trustScores = await TrustScore.find()
      .populate('worker', 'name email position department')
      .sort({ overallScore: 1 });
    res.json(trustScores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  recalculateWorkerScore,
  recalculateOne,
  recalculateAll,
  getWorkerTrustScore,
  getAllTrustScores
};
