const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    // null = platform default (admin-managed); a farm id = that farm's override.
    farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', default: null },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, trim: true }
  },
  { timestamps: true }
);

// One value per key per farm (plus one platform default per key).
SystemConfigSchema.index({ key: 1, farm: 1 }, { unique: true });

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
