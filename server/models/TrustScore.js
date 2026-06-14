const mongoose = require('mongoose');

const TrustScoreSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Component scores (0-100)
    attendanceScore: { type: Number, default: 100, min: 0, max: 100 },
    punctualityScore: { type: Number, default: 100, min: 0, max: 100 },
    taskCompletionScore: { type: Number, default: 100, min: 0, max: 100 },
    responsivenessScore: { type: Number, default: 100, min: 0, max: 100 },
    consistencyScore: { type: Number, default: 100, min: 0, max: 100 },
    // Overall weighted score
    overallScore: { type: Number, default: 100, min: 0, max: 100 },
    // Historical snapshots (last 30 days)
    history: [
      {
        date: { type: Date, default: Date.now },
        score: Number
      }
    ],
    lastCalculated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Calculate weighted overall score
TrustScoreSchema.methods.recalculate = function () {
  // Weights (must sum to 1)
  const weights = {
    attendance: 0.25,
    punctuality: 0.20,
    taskCompletion: 0.30,
    responsiveness: 0.15,
    consistency: 0.10
  };

  this.overallScore = Math.round(
    this.attendanceScore * weights.attendance +
    this.punctualityScore * weights.punctuality +
    this.taskCompletionScore * weights.taskCompletion +
    this.responsivenessScore * weights.responsiveness +
    this.consistencyScore * weights.consistency
  );

  // Keep rolling 30-day history
  this.history.push({ date: new Date(), score: this.overallScore });
  if (this.history.length > 30) this.history.shift();

  this.lastCalculated = new Date();
  return this;
};

module.exports = mongoose.model('TrustScore', TrustScoreSchema);
