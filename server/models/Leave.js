const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true
  },
  leaveType: {
    type: String,
    enum: ['Annual', 'Sick', 'Emergency', 'Unpaid', 'Other'],
    default: 'Annual'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number },
  reason: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: { type: Date },
  managerNotes: { type: String }
}, { timestamps: true });

LeaveSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const diff = new Date(this.endDate) - new Date(this.startDate);
    this.days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

module.exports = mongoose.model('Leave', LeaveSchema);
