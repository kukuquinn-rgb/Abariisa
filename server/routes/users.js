const express = require('express');
const router = express.Router();
const {
	getWorkers,
	getUser,
	updateUser,
	deactivateUser,
	getAllUsers,
	setUserStatus,
	setUserRole,
	getPlatformStats
} = require('../controllers/usersController');
const { protect, scopeFarm, authorise, blockViewOnly } = require('../middleware/auth');

// Admin routes (place before /:id to avoid collisions)
router.get('/admin/stats', protect, scopeFarm, authorise('admin'), getPlatformStats);
router.get('/', protect, scopeFarm, authorise('admin'), getAllUsers);
router.put('/:id/status', protect, scopeFarm, authorise('admin'), setUserStatus);
router.put('/:id/role', protect, scopeFarm, authorise('admin'), setUserRole);

router.get('/workers', protect, scopeFarm, authorise('manager', 'admin'), getWorkers);
router.get('/:id', protect, scopeFarm, getUser);
router.put('/:id', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, updateUser);
router.delete('/:id', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, deactivateUser);

module.exports = router;
