const express = require('express');
const router = express.Router();
const {
  getAttendance,
  checkIn,
  checkOut,
  createAttendance,
  getWorkHours,
  getAttendanceTrends
} = require('../controllers/attendanceController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/trends', protect, getAttendanceTrends);
router.get('/work-hours', protect, getWorkHours);
router.get('/', protect, getAttendance);
router.post('/checkin', protect, blockViewOnly, checkIn);
router.put('/checkout', protect, blockViewOnly, checkOut);
router.post('/', protect, authorise('manager', 'admin'), blockViewOnly, createAttendance);

module.exports = router;