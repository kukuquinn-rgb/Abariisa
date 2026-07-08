const express = require('express');
const router = express.Router();
const {
  recalculateOne,
  recalculateAll,
  getWorkerTrustScore,
  getAllTrustScores
} = require('../controllers/trustScoreController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/', protect, authorise('manager', 'admin'), getAllTrustScores);
router.post('/recalculate-all', protect, authorise('manager', 'admin'), blockViewOnly, recalculateAll);
router.post('/:workerId/recalculate', protect, authorise('manager', 'admin'), blockViewOnly, recalculateOne);
router.get('/:workerId', protect, getWorkerTrustScore);

module.exports = router;
