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
    animalType: {
      type: String,
      enum: ['Bull', 'Cow', 'Heifer', 'Calf', 'Ram', 'Ewe', 'Lamb', 'Boar', 'Sow', 'Piglet', 'Cock', 'Hen', 'Chick', 'Other'],
      default: 'Other'
    },
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
    dailyChecks: [{
      date: { type: Date, default: Date.now },
      checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fed: { type: Boolean, default: false },
      watered: { type: Boolean, default: false },
      returnedToKraal: { type: Boolean, default: false },
      isMissing: { type: Boolean, default: false },
      notes: { type: String }
    }],
    treatments: [{
      type: {
        type: String,
        enum: ['Deworming', 'Spraying', 'Dehorning', 'Salt Lick', 'Vaccination', 'Drug Administration', 'Other']
      },
      drugName: { type: String },
      dose: { type: String },
      dateAdministered: { type: Date },
      administeredBy: { type: String },
      nextDueDate: { type: Date },
      notes: { type: String }
    }],
    matings: [{
      matingDate: { type: Date },
      maleAnimalId: { type: String },
      expectedBirthDate: { type: Date },
      actualBirthDate: { type: Date },
      offspringCount: { type: Number },
      notes: { type: String },
      status: {
        type: String,
        enum: ['Pregnant', 'Gave Birth', 'Lost Pregnancy', 'Unknown'],
        default: 'Unknown'
      }
    }],
    vetAppointments: [{
      date: { type: Date },
      reason: { type: String },
      vetName: { type: String },
      completed: { type: Boolean, default: false },
      notes: { type: String }
    }],
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Livestock', LivestockSchema);
