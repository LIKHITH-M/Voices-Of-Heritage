/**
 * research-service/src/models/observation.model.js
 *
 * MongoDB schema for structured observations extracted from raw TravelExperience events.
 *
 * An Observation is a single (dimension, value, signedScore) tuple extracted from a
 * TravelExperience. Multiple observations per experience are possible.
 *
 * Example: A site_feedback for Hampi with rating=5 might produce observations:
 *   { dimension: 'arch_style',    value: 'Vijayanagara', signedScore: +1.0 }
 *   { dimension: 'site_category', value: 'Ruins',        signedScore: +1.0 }
 *   { dimension: 'heritage_region', value: 'Karnataka',  signedScore: +1.0 }
 *   { dimension: 'time_of_day',   value: 'morning',      signedScore: +1.0 }
 *   { dimension: 'crowd_level',   value: 'low',          signedScore: +1.0 }
 *
 * These observations feed into inferenceEngine.computeAffinityAndConfidence()
 * to build/update DEPKGPreferenceSnapshot documents.
 */

const mongoose = require('mongoose');

const ObservationSchema = new mongoose.Schema({
  // Links
  userId: {
    type: String,
    required: true,
    index: true,
  },
  experienceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TravelExperience',
    required: true,
  },
  tripId: {
    type: String,
    index: true,
  },
  tripIndex: {
    type: Number,       // Sequential trip number for this user (used in decay weighting)
    required: true,
  },

  // The observation itself
  dimension: {
    type: String,
    required: true,
    // 13 valid dimensions from config/default.js DIMENSIONS array
    index: true,
  },
  value: {
    type: String,
    required: true,
  },

  // Scores (computed at extraction time)
  signedScore: {
    type: Number,       // [-1, +1]  computed as (rating - 3) / 2
    required: true,
  },
  weight: {
    type: Number,       // Decay weight — computed at consolidation time, cached here
    default: 1.0,
  },

  // Metadata
  source: {
    type: String,
    enum: ['site_feedback', 'trip_reflection', 'itinerary_modification', 'implicit_behavior', 'system'],
    required: true,
  },
  extractedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'observations',
  timestamps: false,
});

// Compound indexes for efficient preference computation queries
ObservationSchema.index({ userId: 1, dimension: 1, value: 1 });
ObservationSchema.index({ userId: 1, tripIndex: -1 });
ObservationSchema.index({ userId: 1, dimension: 1, tripIndex: -1 });
ObservationSchema.index({ experienceId: 1 });

module.exports = mongoose.model('Observation', ObservationSchema);

