const express = require('express');
const router = express.Router();
const {
  recalculateOne,
  recalculateAll,
  getWorkerTrustScore,
  getAllTrustScores
} = require('../controllers/trustScoreController');
const { protect, scopeFarm, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/', protect, scopeFarm, authorise('manager', 'admin'), getAllTrustScores);
router.post('/recalculate-all', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, recalculateAll);
router.post('/:workerId/recalculate', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, recalculateOne);
router.get('/:workerId', protect, scopeFarm, getWorkerTrustScore);

module.exports = router;
