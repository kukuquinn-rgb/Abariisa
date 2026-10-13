const mongoose = require('mongoose');

const FarmSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Farm name is required'], trim: true },
    district: { type: String, trim: true },
    village: { type: String, trim: true },
    phone: { type: String, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Farm', FarmSchema);
