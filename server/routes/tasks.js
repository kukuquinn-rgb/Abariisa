const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  getRiskSummary,
  getThresholdsRoute,
  updateThresholds,
  getTaskTrends
} = require('../controllers/tasksController');
const { protect, scopeFarm, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/stats', protect, scopeFarm, getTaskStats);
router.get('/trends', protect, scopeFarm, getTaskTrends);
router.get('/risk-summary', protect, scopeFarm, authorise('manager', 'admin'), getRiskSummary);
router.get('/thresholds', protect, scopeFarm, authorise('manager', 'admin'), getThresholdsRoute);
router.put('/thresholds', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, updateThresholds);

router.route('/')
  .get(protect, scopeFarm, getTasks)
  .post(protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, createTask);

router.route('/:id')
  .get(protect, scopeFarm, getTask)
  .put(protect, scopeFarm, blockViewOnly, updateTask)
  .delete(protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, deleteTask);

module.exports = router;