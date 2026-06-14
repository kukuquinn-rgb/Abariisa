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
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

// Admin routes (place before /:id to avoid collisions)
router.get('/admin/stats', protect, authorise('admin'), getPlatformStats);
router.get('/', protect, authorise('admin'), getAllUsers);
router.put('/:id/status', protect, authorise('admin'), setUserStatus);
router.put('/:id/role', protect, authorise('admin'), setUserRole);

router.get('/workers', protect, authorise('manager', 'admin'), getWorkers);
router.get('/:id', protect, getUser);
router.put('/:id', protect, authorise('manager', 'admin'), blockViewOnly, updateUser);
router.delete('/:id', protect, authorise('manager', 'admin'), blockViewOnly, deactivateUser);

module.exports = router;
