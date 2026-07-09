const express = require('express');
const router = express.Router();
const { createWorkPlan, getWorkPlans, updateActivity } = require('../controllers/workPlanController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.post('/', protect, authorise('manager', 'admin'), blockViewOnly, createWorkPlan);
router.get('/', protect, getWorkPlans);
router.put('/:planId/activities/:activityId', protect, blockViewOnly, updateActivity);

module.exports = router;
