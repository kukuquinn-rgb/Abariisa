const express = require('express');
const router = express.Router();
const { handleQuery } = require('../controllers/aiController');
const { protect, scopeFarm } = require('../middleware/auth');

router.post('/', protect, scopeFarm, handleQuery);

module.exports = router;
