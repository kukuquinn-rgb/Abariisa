const express = require('express');
const router = express.Router();
const { createInvite, getMyInvites, revokeInvite, validateInvite } = require('../controllers/invitesController');
const { protect, scopeFarm, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/:code/validate', validateInvite);
router.post('/', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, createInvite);
router.get('/', protect, scopeFarm, authorise('manager', 'admin'), getMyInvites);
router.delete('/:id', protect, scopeFarm, authorise('manager', 'admin'), blockViewOnly, revokeInvite);

module.exports = router;
