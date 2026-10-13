const express = require('express');
const router = express.Router();
const { requestLeave, getMyLeave, getAllLeave, respondToLeave } = require('../controllers/leaveController');
const { protect, scopeFarm, authorise, blockViewOnly } = require('../middleware/auth');

router.post('/', protect, scopeFarm, blockViewOnly, requestLeave);
router.get('/my', protect, scopeFarm, getMyLeave);
router.get('/', protect, scopeFarm, authorise('manager', 'admin'), getAllLeave);
router.put('/:id', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, respondToLeave);

module.exports = router;
