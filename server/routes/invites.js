const express = require('express');
const router = express.Router();
const { createInvite, getMyInvites, revokeInvite, validateInvite } = require('../controllers/invitesController');
const { protect, authorise, blockViewOnly } = require('../middleware/auth');

router.get('/:code/validate', validateInvite);
router.post('/', protect, authorise('manager', 'admin'), blockViewOnly, createInvite);
router.get('/', protect, authorise('manager', 'admin'), getMyInvites);
router.delete('/:id', protect, authorise('manager', 'admin'), blockViewOnly, revokeInvite);

module.exports = router;
