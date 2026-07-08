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
  updateThresholds
} = require('../controllers/tasksController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/stats', protect, getTaskStats);
router.get('/risk-summary', protect, authorise('manager', 'admin'), getRiskSummary);
router.get('/thresholds', protect, authorise('manager', 'admin'), getThresholdsRoute);
router.put('/thresholds', protect, authorise('manager', 'admin'), blockViewOnly, updateThresholds);

router.route('/')
  .get(protect, getTasks)
  .post(protect, authorise('manager', 'admin'), blockViewOnly, createTask);

router.route('/:id')
  .get(protect, getTask)
  .put(protect, blockViewOnly, updateTask)
  .delete(protect, authorise('manager', 'admin'), blockViewOnly, deleteTask);

module.exports = router;
