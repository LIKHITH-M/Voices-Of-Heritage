/**
 * research-service/src/models/experiment.model.js
 *
 * Mongoose schema for Research Evaluation Experiments.
 * Records generation runs for Mode A (Baseline) vs Mode B (Research PTKG) comparison.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ExperimentLogSchema = new Schema(
  {
    runId: { type: String, unique: true, required: true, index: true },
    userId: { type: String, required: true, index: true },
    tripId: String,
    destination: { type: String, required: true },
    mode: { type: String, enum: ['baseline', 'research'], required: true, index: true },
    durationDays: { type: Number, default: 3 },
    generationTimeMs: { type: Number, default: 0 },
    verificationScore: { type: Number, default: 5 },
    ptkgContextUsed: { type: Boolean, default: false },
    ragChunksUsed: { type: Number, default: 0 },
    metrics: {
      preferenceAlignmentScore: { type: Number, default: 0 },
      constraintSatisfactionRate: { type: Number, default: 1.0 },
      spatioTemporalEfficiency: { type: Number, default: 0.8 },
      diversityScore: { type: Number, default: 0.5 },
      averageDailyHours: { type: Number, default: 6.5 },
      totalEstimatedCost: { type: Number, default: 0 },
    },
    rawPromptLength: Number,
    completionTokensEst: Number,
    userAgent: String,
  },
  {
    timestamps: true,
    collection: 'research_experiments',
  }
);

ExperimentLogSchema.index({ mode: 1, createdAt: -1 });

module.exports = mongoose.models.ExperimentLog || mongoose.model('ExperimentLog', ExperimentLogSchema);

