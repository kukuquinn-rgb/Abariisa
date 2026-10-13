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
const { protect, scopeFarm, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/trends', protect, scopeFarm, getAttendanceTrends);
router.get('/work-hours', protect, scopeFarm, getWorkHours);
router.get('/', protect, scopeFarm, getAttendance);
router.post('/checkin', protect, scopeFarm, blockViewOnly, checkIn);
router.put('/checkout', protect, scopeFarm, blockViewOnly, checkOut);
router.post('/', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, createAttendance);

module.exports = router;