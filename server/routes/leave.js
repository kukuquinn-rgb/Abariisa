const express = require('express');
const router = express.Router();
const { requestLeave, getMyLeave, getAllLeave, respondToLeave } = require('../controllers/leaveController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.post('/', protect, blockViewOnly, requestLeave);
router.get('/my', protect, getMyLeave);
router.get('/', protect, authorise('manager', 'admin'), getAllLeave);
router.put('/:id', protect, authorise('manager', 'admin'), blockViewOnly, respondToLeave);

module.exports = router;
