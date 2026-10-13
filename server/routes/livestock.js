const express = require('express');
const router = express.Router();
const {
  getLivestock, getLivestockById, addLivestock,
  updateLivestock, archiveLivestock, addVaccination,
  addDailyCheck, addTreatment, addMating,
  getDueTreatments, getPregnancies, getLivestockStats
} = require('../controllers/livestockController');
const { protect, scopeFarm, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/stats', protect, scopeFarm, getLivestockStats);
router.get('/due-treatments', protect, scopeFarm, getDueTreatments);
router.get('/pregnancies', protect, scopeFarm, getPregnancies);
router.route('/')
  .get(protect, scopeFarm, getLivestock)
  .post(protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, addLivestock);

router.post('/:id/daily-check', protect, scopeFarm, blockViewOnly, addDailyCheck);
router.post('/:id/treatments', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, addTreatment);
router.post('/:id/matings', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, addMating);

router.route('/:id')
  .get(protect, scopeFarm, getLivestockById)
  .put(protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, updateLivestock)
  .delete(protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, archiveLivestock);

router.post('/:id/vaccinations', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, addVaccination);

module.exports = router;
