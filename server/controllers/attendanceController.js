const Attendance = require('../models/Attendance');
const TrustScore = require('../models/TrustScore');

// @desc   Get attendance records
// @route  GET /api/attendance
const getAttendance = async (req, res) => {
  try {
    const { workerId, startDate, endDate } = req.query;
    const filter = {};

    if (req.user.role === 'worker') filter.worker = req.user.id;
    else if (workerId) filter.worker = workerId;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('worker', 'name email position')
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Record check-in
// @route  POST /api/attendance/checkin
const checkIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({ worker: req.user.id, date: today });
    if (existing) return res.status(400).json({ message: 'Already checked in today' });

    const scheduledStart = new Date();
    scheduledStart.setHours(7, 0, 0, 0); // Default 7 AM start

    const record = await Attendance.create({
      worker: req.user.id,
      date: today,
      checkIn: new Date(),
      scheduledStart,
      recordedBy: req.user.id
    });

    // Update attendance trust score component
    await updateAttendanceTrustScore(req.user.id);

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Record check-out
// @route  PUT /api/attendance/checkout
const checkOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await Attendance.findOne({ worker: req.user.id, date: today });
    if (!record) return res.status(404).json({ message: 'No check-in found for today' });
    if (record.checkOut) return res.status(400).json({ message: 'Already checked out today' });

    record.checkOut = new Date();
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Manager records attendance manually
// @route  POST /api/attendance
const createAttendance = async (req, res) => {
  try {
    const record = await Attendance.create({ ...req.body, recordedBy: req.user.id });
    res.status(201).json(record);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Attendance already recorded for this worker on this date' });
    res.status(500).json({ message: err.message });
  }
};

// Helper: update attendance-related trust score components
const updateAttendanceTrustScore = async (workerId) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const records = await Attendance.find({ worker: workerId, date: { $gte: thirtyDaysAgo } });

  if (records.length === 0) return;

  const present = records.filter((r) => r.status !== 'Absent').length;
  const onTime = records.filter((r) => r.status === 'Present').length;

  const attendanceScore = Math.round((present / records.length) * 100);
  const punctualityScore = present > 0 ? Math.round((onTime / present) * 100) : 100;

  const trustScore = await TrustScore.findOne({ worker: workerId });
  if (trustScore) {
    trustScore.attendanceScore = attendanceScore;
    trustScore.punctualityScore = punctualityScore;
    trustScore.recalculate();
    await trustScore.save();
  }
};

module.exports = { getAttendance, checkIn, checkOut, createAttendance };
