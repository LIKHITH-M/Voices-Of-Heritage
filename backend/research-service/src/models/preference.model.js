/**
 * research-service/src/models/preference.model.js
 *
 * MongoDB schema for Personal Travel Knowledge Graph preference snapshots.
 * This is the core "learned preference" record — one document per (userId, dimension, value).
 *
 * Updated after every consolidation run via consolidationEngine.js.
 *
 * Example document:
 * {
 *   userId: "firebase_uid_123",
 *   dimension: "arch_style",
 *   value: "Dravidian",
 *   affinity: 0.85,
 *   confidence: 0.72,
 *   status: "like",
 *   driftFlag: false,
 *   recentAffinity: 0.90,
 *   olderAffinity: 0.78,
 *   observationCount: 7,
 *   effectiveN: 4.3,
 *   lastConsolidatedAt: ISODate(...)
 * }
 */

const mongoose = require('mongoose');

const PreferenceSnapshotSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  dimension: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },

  // Computed by inferenceEngine.computeAffinityAndConfidence()
  affinity: {
    type: Number,     // [-1, +1]
    required: true,
  },
  confidence: {
    type: Number,     // [0, 1]
    required: true,
  },
  status: {
    type: String,
    enum: ['like', 'avoid', 'weak', 'retired'],
    required: true,
  },

  // Raw sums for incremental updates
  positiveWeightedSum: { type: Number, default: 0 },
  negativeWeightedSum: { type: Number, default: 0 },
  effectiveN: { type: Number, default: 0 },
  observationCount: { type: Number, default: 0 },

  // Drift detection
  driftFlag: { type: Boolean, default: false },
  recentAffinity: Number,
  olderAffinity: Number,

  // Evidence links
  supportingObsIds: [mongoose.Schema.Types.ObjectId],
  contradictingObsIds: [mongoose.Schema.Types.ObjectId],

  // Temporal tracking
  mostRecentTripIndex: Number,
  lastConsolidationRunId: String,
  lastConsolidatedAt: Date,
}, {
  collection: 'preference_snapshots',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

// Unique compound index: one preference per (user, dimension, value)
PreferenceSnapshotSchema.index({ userId: 1, dimension: 1, value: 1 }, { unique: true });
// Retrieval indexes
PreferenceSnapshotSchema.index({ userId: 1, status: 1, affinity: -1 });
PreferenceSnapshotSchema.index({ userId: 1, dimension: 1, status: 1 });

module.exports = mongoose.model('PreferenceSnapshot', PreferenceSnapshotSchema);

