const express = require('express');
const router = express.Router();
const { getFarms } = require('../controllers/farmsController');
const { protect, authorise } = require('../middleware/auth');

// Platform-level (admin) farm listing
router.get('/', protect, authorise('admin'), getFarms);

module.exports = router;
