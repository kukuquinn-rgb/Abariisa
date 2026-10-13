const express = require('express');
const router = express.Router();
const { getNotifications, markRead, markAllRead, unreadCount } = require('../controllers/notificationsController');
const { protect, scopeFarm } = require('../middleware/auth');

router.get('/', protect, scopeFarm, getNotifications);
router.get('/unread-count', protect, scopeFarm, unreadCount);
router.put('/read-all', protect, scopeFarm, markAllRead);
router.put('/:id/read', protect, scopeFarm, markRead);

module.exports = router;
