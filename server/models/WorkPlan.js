const mongoose = require('mongoose');

const WorkPlanSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true
  },
  activities: [{
    title: { type: String, required: true },
    scheduledTime: { type: String },
    isRepetitive: { type: Boolean, default: false },
    repeatFrequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', null],
      default: null
    },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Skipped'],
      default: 'Pending'
    },
    workerNotes: { type: String },
    leakPoint: { type: Boolean, default: false },
    leakPointDescription: { type: String }
  }],
  overallStatus: {
    type: String,
    enum: ['Draft', 'Active', 'Completed', 'Partial'],
    default: 'Active'
  }
}, { timestamps: true });

module.exports = mongoose.model('WorkPlan', WorkPlanSchema);
