const mongoose = require('mongoose');
const { Schema } = mongoose;

const ExperienceSchema = new Schema(
  {
    experienceId: { type: String, unique: true, required: true, index: true },
    eventKey: { type: String, index: true, sparse: true }, // Idempotency key for auto-collection
    userId: { type: String, required: true, index: true },
    tripId: { type: String, index: true, default: null },
    placeId: { type: String, default: null },
    activityId: { type: String, default: null },

    experienceType: {
      type: String,
      enum: [
        'trip',
        'place',
        'activity',
        'food',
        'wellness',
        'booking',
        'stay',
        'guide',
        'archive',
        'immersive',
        'route',
      ],
      default: 'place',
      index: true,
    },

    title: { type: String, required: true },
    destination: { type: String, default: '' },
    region: { type: String, default: '' },
    placeName: { type: String, default: '' },

    visitStatus: {
      type: String,
      enum: [
        'planned',
        'visited',
        'partially_visited',
        'not_visited',
        'cancelled',
        'could_not_visit',
        'different_from_planned',
      ],
      default: 'visited',
    },
    feedbackStatus: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    sourceType: {
      type: String,
      enum: ['auto_generated', 'user_submitted', 'hybrid'],
      default: 'user_submitted',
    },

    // Section 6: Planned vs Actual Behaviour
    plannedData: {
      destination: String,
      placeName: String,
      activityName: String,
      plannedDate: String,
      plannedTime: String,
      plannedDurationHours: Number,
      estimatedCostINR: Number,
      transportMode: String,
      groupSize: Number,
      companions: String,
    },
    actualData: {
      destination: String,
      placeName: String,
      actualActivity: String,
      actualDate: String,
      actualTime: String,
      actualDurationHours: Number,
      actualCostINR: Number,
      skippedReason: String,
      transportMode: String,
      groupSize: Number,
      companions: String,
      walkingDistanceKm: Number,
    },

    // Section 9: Linked Booking / Ticket Info (pre-filled from existing DB)
    bookingData: {
      bookingId: String,
      sourceModule: String, // 'asi_ticket' | 'smart_stay' | 'wellness' | 'guide'
      ticketType: String,
      visitorType: String,
      bookingStatus: String,
      bookingDate: String,
      visitDate: String,
      ticketPriceINR: Number,
      entryExperience: Number, // 1-5
      waitingTimeMins: Number,
    },

    // Section 10: Contextual Weather (only real/observed data, never fabricated)
    weatherContext: {
      location: String,
      date: String,
      condition: String,
      temperatureC: Number,
      rain: Boolean,
      humidity: Number,
      windKmh: Number,
      alerts: [String],
      itineraryChanged: Boolean,
      weatherImpactNote: String,
      source: String,
    },

    // Section 3, 7, 8, 11: Multi-dimensional Ratings
    ratings: {
      overall: { type: Number, min: 1, max: 5 },
      experienceQuality: { type: Number, min: 1, max: 5 },
      authenticity: { type: Number, min: 1, max: 5 },
      cleanliness: { type: Number, min: 1, max: 5 },
      crowdLevel: { type: Number, min: 1, max: 5 }, // 1=very low, 5=extremely crowded
      accessibility: { type: Number, min: 1, max: 5 },
      safety: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 },
      informationQuality: { type: Number, min: 1, max: 5 },
      satisfaction: { type: Number, min: 1, max: 5 },
      // Food specific
      taste: { type: Number, min: 1, max: 5 },
      hygiene: { type: Number, min: 1, max: 5 },
      portionSize: { type: Number, min: 1, max: 5 },
      // Wellness specific
      peacefulness: { type: Number, min: 1, max: 5 },
      environment: { type: Number, min: 1, max: 5 },
      // Stay / Guide / Route specific
      locationSatisfaction: { type: Number, min: 1, max: 5 },
      guideExpertise: { type: Number, min: 1, max: 5 },
      routeSatisfaction: { type: Number, min: 1, max: 5 },
    },

    wouldVisitAgain: { type: String, enum: ['yes', 'no', 'maybe', null], default: null },
    wouldRecommend: { type: Boolean, default: null },

    // Section 4: Explicit Preference Signals
    enjoyedTags: { type: [String], default: [] },
    dislikedTags: { type: [String], default: [] },
    nextTimePreferences: { type: [String], default: [] },

    // Section 7: Food Heritage Details
    foodDetails: {
      locationName: String,
      cuisine: String,
      dish: String,
      region: String,
      category: String,
      favouriteDishes: [String],
      dislikedDishes: [String],
      dietaryPreferences: [String], // Only if voluntarily provided
      wouldTryAgain: String,
    },

    // Section 8: Wellness & Spiritual Details
    wellnessDetails: {
      experienceSubType: String, // Yoga | Meditation | Ayurveda | Temple | Spiritual Site | Retreat
      duration: String,
      preferredTime: String,
    },

    // Section 11: Extensible VoH Module Metadata (Stay, Guide, Archive, Immersive, Route)
    moduleMetadata: { type: Schema.Types.Mixed, default: {} },

    // Section 5: Original Feedback + Structured Extraction
    freeTextFeedback: { type: String, default: '' },
    positiveSignals: { type: [String], default: [] },
    negativeSignals: { type: [String], default: [] },
    extractedKnowledge: { type: Schema.Types.Mixed, default: null },
    sentiment: {
      type: String,
      enum: ['positive', 'mixed', 'neutral', 'negative'],
      default: 'neutral',
    },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },

    visitedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ExperienceSchema.index({ userId: 1, eventKey: 1 }, { unique: true, sparse: true });
ExperienceSchema.index({ userId: 1, tripId: 1 });
ExperienceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Experience || mongoose.model('Experience', ExperienceSchema);
