const express = require('express');
const router = express.Router();
const {
  getLivestock, getLivestockById, addLivestock,
  updateLivestock, archiveLivestock, addVaccination,
  addDailyCheck, addTreatment, addMating,
  getDueTreatments, getPregnancies, getLivestockStats
} = require('../controllers/livestockController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/stats', protect, getLivestockStats);
router.get('/due-treatments', protect, getDueTreatments);
router.get('/pregnancies', protect, getPregnancies);
router.route('/')
  .get(protect, getLivestock)
  .post(protect, authorise('manager', 'admin'), blockViewOnly, addLivestock);

router.post('/:id/daily-check', protect, blockViewOnly, addDailyCheck);
router.post('/:id/treatments', protect, authorise('manager', 'admin'), blockViewOnly, addTreatment);
router.post('/:id/matings', protect, authorise('manager', 'admin'), blockViewOnly, addMating);

router.route('/:id')
  .get(protect, getLivestockById)
  .put(protect, authorise('manager', 'admin'), blockViewOnly, updateLivestock)
  .delete(protect, authorise('manager', 'admin'), blockViewOnly, archiveLivestock);

router.post('/:id/vaccinations', protect, authorise('manager', 'admin'), blockViewOnly, addVaccination);

module.exports = router;
