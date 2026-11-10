/**
 * research-service/src/models/trip.model.js
 *
 * MongoDB schema for persisted trips.
 * Replaces localStorage('voh_saved_trips') with backend storage.
 *
 * Key design decisions:
 * - Stores BOTH the original LLM-generated itinerary AND the final rendered version
 * - Tracks generationMode ('baseline' vs 'research') for A/B comparison
 * - Stores ptkgContextSnapshot so we can audit what PTKG context was used
 * - Stores verificationScore from verifier.js
 * - Has status lifecycle: planned → ongoing → completed → cancelled
 */

const mongoose = require('mongoose');

// ─── Activity sub-schema (matches LLM output format) ─────────────────────────

const CoordinatesSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
}, { _id: false });

const ActivitySchema = new mongoose.Schema({
  time: String,                     // e.g. "09:00 AM"
  name: String,                     // Activity name
  location: {
    name: String,
    address: String,
    coordinates: CoordinatesSchema,
  },
  duration: String,                 // e.g. "2 hours"
  cost: Number,                     // INR
  description: String,
  type: String,                     // 'heritage' | 'dining' | 'transport' | 'accommodation'
  heritage_note: String,            // Heritage/historical context from LLM
  siteId: String,                   // Links to HeritageSite in MongoDB
  preferenceMatch: String,          // Evidence-based rationale shown in the planner
}, { _id: false });

const DayPlanSchema = new mongoose.Schema({
  day: Number,
  date: String,
  title: String,
  heritage_summary: String,
  activities: [ActivitySchema],
  totalDayCost: Number,
}, { _id: false });

// ─── Cost Breakdown sub-schema ────────────────────────────────────────────────

const CostBreakdownSchema = new mongoose.Schema({
  accommodation: Number,
  food: Number,
  activities: Number,
  transport: Number,
  misc: Number,
}, { _id: false });

// ─── PTKG Context Snapshot (audit trail) ─────────────────────────────────────

const PTKGContextSnapshotSchema = new mongoose.Schema({
  isColdStart: Boolean,
  totalTripsInHistory: Number,
  candidateSitesConsidered: Number,
  preferencesApplied: Number,
  topLikedPreferences: [String],
  topAvoidedPreferences: [String],
  compressionRatio: Number,         // tokens in PTKG context / total possible tokens
}, { _id: false, strict: false });

// ─── Main Trip Schema ─────────────────────────────────────────────────────────

const TripSchema = new mongoose.Schema({
  tripId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },

  // ── Trip metadata (from user form input) ──────────────────────────────────
  destination: { type: String, required: true },
  startDate: String,
  endDate: String,
  totalDays: Number,
  travelers: Number,
  budget: String,                   // 'budget' | 'mid' | 'comfort' | 'luxury'
  currency: { type: String, default: 'INR' },
  travelStyle: String,
  pace: String,
  interests: [String],
  dietary: [String],
  includeHotels: Boolean,
  includeTransport: Boolean,

  // ── Generated itinerary (from LLM — NOT from buildTrip() fallback) ────────
  originalItinerary: [DayPlanSchema],
  itinerary: [DayPlanSchema],

  // ── AI metadata ────────────────────────────────────────────────────────────
  summary: String,
  highlights: [String],
  heritageTheme: String,
  localCuisineRecommendations: [String],
  totalEstimatedCost: Number,
  costBreakdown: CostBreakdownSchema,

  // ── Research metadata ──────────────────────────────────────────────────────
  generationMode: {
    type: String,
    enum: ['baseline', 'research'],
    default: 'baseline',
  },
  llmModel: String,                 // Which model generated this (groq/gemini/knowledge-graph)
  ptkgContextSnapshot: PTKGContextSnapshotSchema,
  verificationScore: Number,        // 0-5 from verifier.js
  generationDurationMs: Number,     // How long generation took

  // ── Lifecycle status ───────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
    default: 'planned',
  },
  overallSatisfaction: { type: Number, min: 1, max: 5 }, // set after completion

  // ── Continual learning ─────────────────────────────────────────────────────
  isConsolidated: { type: Boolean, default: false },      // has this trip fed into preference inference?
  consolidatedAt: Date,
  tripIndex: Number,                // Sequential trip number for this user (for decay weighting)

}, {
  collection: 'saved_trips',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

// Compound indexes
TripSchema.index({ userId: 1, createdAt: -1 });
TripSchema.index({ userId: 1, status: 1 });
TripSchema.index({ userId: 1, isConsolidated: 1 });

module.exports = mongoose.model('SavedTrip', TripSchema);

