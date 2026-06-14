const express = require('express');
const router = express.Router();
const {
  getLivestock, getLivestockById, addLivestock,
  updateLivestock, archiveLivestock, addVaccination, getLivestockStats
} = require('../controllers/livestockController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/stats', protect, getLivestockStats);
router.route('/')
  .get(protect, getLivestock)
  .post(protect, authorise('manager', 'admin'), blockViewOnly, addLivestock);

router.route('/:id')
  .get(protect, getLivestockById)
  .put(protect, authorise('manager', 'admin'), blockViewOnly, updateLivestock)
  .delete(protect, authorise('manager', 'admin'), blockViewOnly, archiveLivestock);

router.post('/:id/vaccinations', protect, authorise('manager', 'admin'), blockViewOnly, addVaccination);

module.exports = router;
