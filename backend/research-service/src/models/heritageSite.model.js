/**
 * research-service/src/models/heritageSite.model.js
 *
 * Mongoose schema for Heritage Sites in the research knowledge base.
 * Compatible with existing ai-planner-service's HeritageSite collection.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const HeritageSiteSchema = new Schema(
  {
    siteId: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true, index: true },
    subtitle: String,
    region: { type: String, index: true },
    district: String,
    state: String,
    archStyle: [{ type: String, index: true }],
    period: [{ type: String }],
    dynasty: [{ type: String, index: true }],
    siteCategory: { type: String, index: true },
    knownFor: [{ type: String }],
    tags: [{ type: String }],
    unescoStatus: { type: String, default: 'none' },
    entryFeeINR: { type: Number, default: 0 },
    avgVisitDurationHours: { type: Number, default: 2.5 },
    bestTimeToVisit: String,
    timings: String,
    commonActivities: [{ type: String }],
    localCuisine: [{ type: String }],
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    nearbySites: [{ type: String }],
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 4.5 },
    reviews: { type: Number, default: 100 },
    highlights: [{ type: String }],
    desc: String,
    longDesc: String,
  },
  {
    timestamps: true,
    collection: 'heritagesites',
  }
);

// Indexes for context retrieval and spatial / geo lookup
HeritageSiteSchema.index({ region: 1, siteCategory: 1 });
HeritageSiteSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });

module.exports = mongoose.models.HeritageSite || mongoose.model('HeritageSite', HeritageSiteSchema);

