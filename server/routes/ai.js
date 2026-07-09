const express = require('express');
const router = express.Router();
const { handleQuery } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/', protect, handleQuery);

module.exports = router;
