const express = require('express');
const router = express.Router();
const { createWorkPlan, getWorkPlans, updateActivity } = require('../controllers/workPlanController');
const { protect, scopeFarm, authorise, blockViewOnly } = require('../middleware/auth');

router.post('/', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, createWorkPlan);
router.get('/', protect, scopeFarm, getWorkPlans);
router.put('/:planId/activities/:activityId', protect, scopeFarm, blockViewOnly, updateActivity);

module.exports = router;
