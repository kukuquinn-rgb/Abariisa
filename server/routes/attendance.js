const express = require('express');
const router = express.Router();
const { getAttendance, checkIn, checkOut, createAttendance, getWorkHours } = require('../controllers/attendanceController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/', protect, getAttendance);
router.get('/work-hours', protect, getWorkHours);
router.post('/checkin', protect, blockViewOnly, checkIn);
router.put('/checkout', protect, blockViewOnly, checkOut);
router.post('/', protect, authorise('manager', 'admin'), blockViewOnly, createAttendance);

module.exports = router;
