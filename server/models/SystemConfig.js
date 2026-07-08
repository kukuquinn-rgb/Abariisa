const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
