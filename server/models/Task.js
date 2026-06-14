const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Task title is required'], trim: true },
    description: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Pending', 'Acknowledged', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending'
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    completedAt: { type: Date },
    riskFlag: {
      type: String,
      enum: ['Low', 'Medium', 'High', null],
      default: null
    },
    category: {
      type: String,
      enum: ['Feeding', 'Medication', 'Cleaning', 'Inspection', 'Maintenance', 'Other'],
      default: 'Other'
    },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

// Auto-flag overdue tasks
TaskSchema.pre('save', function (next) {
  if (this.status !== 'Completed' && this.dueDate < new Date()) {
    this.status = 'Overdue';
  }
  next();
});

module.exports = mongoose.model('Task', TaskSchema);
