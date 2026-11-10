/**
 * research-service/src/models/experience.model.js
 *
 * MongoDB schema for travel experience events.
 * This is the primary intake point for ALL user travel signals:
 *   - site_feedback: post-visit feedback for a specific heritage site
 *   - trip_reflection: holistic post-trip reflection
 *   - search: search queries from ExploreSitesPage
 *   - bookmark: site bookmarks (from wishlist / saved)
 *   - map_interaction: map click / zoom / explore actions
 *   - itinerary_modification: user edits to a generated itinerary
 *   - behavior: any other implicit signal
 *
 * Each experience is processed by the ObservationExtractor to produce
 * structured Observation documents, which then feed the preference
 * inference and PTKG update pipeline.
 */

const mongoose = require('mongoose');

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const LocationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  name: String,
}, { _id: false });

const ModificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['swap_activity', 'add_activity', 'remove_activity', 'reorder_day', 'change_hotel', 'change_transport'],
  },
  day: Number,
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
}, { _id: false });

// ─── Main Payload Schema ──────────────────────────────────────────────────────
// Flexible JSONB-style payload. Fields are optional and depend on eventType.

const PayloadSchema = new mongoose.Schema({
  // --- For site_feedback ---
  siteId: String,
  siteName: String,
  satisfactionRating: { type: Number, min: 1, max: 5 },
  activities: [String],
  feedbackTags: [String],           // e.g. ['crowded', 'beautiful', 'overpriced', 'great-guide']
  notes: String,
  duration: Number,                 // minutes spent at the site
  timeOfDay: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', null],
  },
  crowdLevel: {
    type: String,
    enum: ['low', 'mid', 'high', null],
  },
  transportMode: String,
  weather: String,
  companions: Number,
  wouldRecommend: Boolean,
  wouldRevisit: Boolean,

  // --- For trip_reflection ---
  overallSatisfaction: { type: Number, min: 1, max: 5 },
  bestMoment: String,
  wouldChange: [String],
  dimensionRatings: {
    heritage_value: Number,
    food_quality: Number,
    accommodation: Number,
    transport: Number,
    crowd_comfort: Number,
    value_for_money: Number,
    guide_quality: Number,
    accessibility: Number,
  },
  preferencesDiscovered: [String],

  // --- For search ---
  searchQuery: String,
  resultsCount: Number,
  clickedResult: String,

  // --- For map_interaction ---
  mapAction: {
    type: String,
    enum: ['click_site', 'zoom_in', 'zoom_out', 'explore_area', 'open_popup', 'route_request', null],
  },
  coordinates: LocationSchema,
  zoomLevel: Number,
  viewDuration: Number,             // seconds the popup / detail was open

  // --- For bookmark ---
  action: {
    type: String,
    enum: ['add', 'remove', null],
  },

  // --- For itinerary_modification ---
  modification: ModificationSchema,

}, { _id: false, strict: false });   // strict:false allows extra fields in payload

// ─── Main Experience Schema ───────────────────────────────────────────────────

const ExperienceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  tripId: {
    type: String,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'site_feedback',
      'trip_reflection',
      'search',
      'bookmark',
      'map_interaction',
      'itinerary_modification',
      'behavior',
    ],
    index: true,
  },
  payload: {
    type: PayloadSchema,
    required: true,
  },
  source: {
    type: String,
    enum: ['manual_feedback', 'reflection', 'implicit_behavior', 'system'],
    default: 'manual_feedback',
  },
  // Processing state — has this event been converted to Observations yet?
  processed: {
    type: Boolean,
    default: false,
    index: true,
  },
  processedAt: Date,
  observationIds: [mongoose.Schema.Types.ObjectId],  // links to Observation docs created from this

  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  collection: 'travel_experiences',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

// Compound index for efficient per-user time-series queries
ExperienceSchema.index({ userId: 1, timestamp: -1 });
ExperienceSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
ExperienceSchema.index({ processed: 1, timestamp: -1 }); // for batch processing

module.exports = mongoose.model('TravelExperience', ExperienceSchema);

