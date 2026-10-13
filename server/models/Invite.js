const mongoose = require('mongoose');
const crypto = require('crypto');

const InviteSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, lowercase: true, trim: true },
    role: { type: String, enum: ['manager', 'worker'], default: 'manager' },
    viewOnly: { type: Boolean, default: true },
    used: { type: Boolean, default: false },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

InviteSchema.statics.generateCode = function () {
  return crypto.randomBytes(6).toString('hex');
};

module.exports = mongoose.model('Invite', InviteSchema);
