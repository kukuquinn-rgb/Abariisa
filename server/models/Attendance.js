const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'Half Day'],
      default: 'Present'
    },
    scheduledStart: { type: Date }, // Set by manager
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Ensure one record per worker per day
AttendanceSchema.index({ worker: 1, date: 1 }, { unique: true });

// Auto-classify status based on check-in vs scheduled start
AttendanceSchema.pre('save', function (next) {
  if (this.checkIn && this.scheduledStart) {
    const diffMinutes = (this.checkIn - this.scheduledStart) / (1000 * 60);
    if (diffMinutes <= 10) {
      this.status = 'Present';
    } else {
      this.status = 'Late';
    }
  }
  next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
