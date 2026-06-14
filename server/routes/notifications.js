const express = require('express');
const router = express.Router();
const { getNotifications, markRead, markAllRead, unreadCount } = require('../controllers/notificationsController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, unreadCount);
router.put('/read-all', protect, markAllRead);
router.put('/:id/read', protect, markRead);

module.exports = router;
