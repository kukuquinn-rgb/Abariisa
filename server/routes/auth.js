const express = require('express');
const router = express.Router();
const { register, registerFarm, login, getMe, google, onboard } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register-farm', registerFarm);
router.post('/register', register);
router.post('/login', login);
router.post('/google', google);
router.post('/onboard', protect, onboard);
router.get('/me', protect, getMe);

module.exports = router;
