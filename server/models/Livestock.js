const mongoose = require('mongoose');

const LivestockSchema = new mongoose.Schema(
  {
    animalId: { type: String, required: true, unique: true, trim: true },
    species: {
      type: String,
      required: true,
      enum: ['Cattle', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other']
    },
    breed: { type: String, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Unknown'], default: 'Unknown' },
    dateOfBirth: { type: Date },
    healthStatus: {
      type: String,
      enum: ['Healthy', 'Sick', 'Under Treatment', 'Quarantined', 'Deceased'],
      default: 'Healthy'
    },
    weight: { type: Number }, // kg
    feedingSchedule: { type: String, trim: true },
    location: { type: String, trim: true },
    vaccinationHistory: [
      {
        vaccine: String,
        date: Date,
        nextDueDate: Date,
        administeredBy: String
      }
    ],
    notes: { type: String, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Livestock', LivestockSchema);
