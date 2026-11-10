/**
 * research-service/src/controllers/trip.controller.js
 *
 * CRUD operations for persisted trips.
 *
 * Key responsibilities:
 * - Save newly generated trips (called by frontend after /api/ai/generate-heritage-itinerary)
 * - Load user trip history (replaces localStorage reads in ProfilePage)
 * - Update trip status (planned → ongoing → completed)
 * - Provide trip data for PTKG consolidation trigger
 */

const SavedTrip = require('../models/trip.model');
const { v4: uuidv4 } = require('uuid');

function normalizeItinerary(itinerary = []) {
  return (Array.isArray(itinerary) ? itinerary : []).map((day, index) => {
    const activities = (Array.isArray(day.activities) ? day.activities : []).map(activity => {
      const amount = typeof activity.cost === 'object' && activity.cost !== null
        ? activity.cost.amount : activity.cost;
      return {
        time: activity.time,
        name: activity.name || activity.activity || '',
        location: activity.location ? {
          name: activity.location.name,
          address: activity.location.address,
          coordinates: activity.location.coordinates,
        } : Number.isFinite(activity.lat) && Number.isFinite(activity.lng) ? {
          name: activity.name || activity.activity || '',
          address: activity.address,
          coordinates: { lat: activity.lat, lng: activity.lng },
        } : undefined,
        duration: typeof activity.duration === 'number' ? `${activity.duration} hours` : activity.duration,
        cost: Number(amount) || 0,
        description: activity.description,
        type: activity.type,
        heritage_note: activity.heritage_note,
        siteId: activity.siteId,
        preferenceMatch: typeof activity.preferenceMatch === 'string' ? activity.preferenceMatch : undefined,
      };
    });
    return {
      day: Number(day.day) || index + 1,
      date: day.date,
      title: day.title,
      heritage_summary: day.heritage_summary,
      activities,
      totalDayCost: activities.reduce((total, activity) => total + activity.cost, 0),
    };
  });
}
exports.normalizeItinerary = normalizeItinerary;

// ─── Create a new trip ────────────────────────────────────────────────────────

/**
 * POST /api/trips
 * Save a newly generated itinerary to MongoDB.
 *
 * Body: { userId, destination, startDate, endDate, travelers, budget, currency,
 *         travelStyle, pace, interests, dietary, includeHotels, includeTransport,
 *         itinerary[], summary, highlights, heritageTheme, totalEstimatedCost,
 *         costBreakdown, generationMode, llmModel, ptkgContextSnapshot, verificationScore }
 */
exports.createTrip = async (req, res, next) => {
  try {
    const {
      userId,
      destination,
      startDate,
      endDate,
      travelers,
      budget,
      currency,
      travelStyle,
      pace,
      interests,
      dietary,
      includeHotels,
      includeTransport,
      itinerary,
      summary,
      highlights,
      heritageTheme,
      localCuisineRecommendations,
      totalEstimatedCost,
      costBreakdown,
      generationMode,
      llmModel,
      ptkgContextSnapshot,
      verificationScore,
      generationDurationMs,
    } = req.body;

    if (!userId || !destination) {
      return res.status(400).json({ success: false, error: 'userId and destination are required' });
    }

    // Calculate sequential trip index for this user (needed for decay weighting)
    const existingTripCount = await SavedTrip.countDocuments({ userId });
    const normalizedItinerary = normalizeItinerary(itinerary);

    // Calculate total days from itinerary or dates
    let totalDays = itinerary ? itinerary.length : 1;
    if (startDate && endDate) {
      const diff = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000);
      totalDays = Math.max(1, diff);
    }

    const trip = await SavedTrip.create({
      tripId: uuidv4(),
      userId,
      destination,
      startDate,
      endDate,
      totalDays,
      travelers,
      budget,
      currency: currency || 'INR',
      travelStyle,
      pace,
      interests: interests || [],
      dietary: dietary || [],
      includeHotels,
      includeTransport,
      originalItinerary: normalizedItinerary,
      itinerary: normalizedItinerary,
      summary,
      highlights: highlights || [],
      heritageTheme,
      localCuisineRecommendations: localCuisineRecommendations || [],
      totalEstimatedCost: Number(totalEstimatedCost?.amount ?? totalEstimatedCost) || 0,
      costBreakdown,
      generationMode: generationMode || 'baseline',
      llmModel,
      ptkgContextSnapshot,
      verificationScore,
      generationDurationMs,
      tripIndex: existingTripCount + 1,
      status: 'planned',
    });

    return res.status(201).json({
      success: true,
      tripId: trip.tripId,
      message: 'Trip saved to backend',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get all trips for a user ─────────────────────────────────────────────────

/**
 * GET /api/trips/:userId
 * Returns paginated trip history for a user.
 * Sorted by most recent first.
 * Query params: limit (default 20), offset (default 0), status (optional filter)
 */
exports.getUserTrips = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    const filter = { userId };
    if (status) filter.status = status;

    const [trips, total] = await Promise.all([
      SavedTrip.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .select('-itinerary')    // Exclude heavy itinerary array from list view
        .lean(),
      SavedTrip.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      total,
      limit,
      offset,
      data: trips,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get a single trip ────────────────────────────────────────────────────────

/**
 * GET /api/trips/:userId/:tripId
 * Returns full trip including itinerary array.
 */
exports.getTrip = async (req, res, next) => {
  try {
    const { userId, tripId } = req.params;
    const trip = await SavedTrip.findOne({ userId, tripId }).lean();

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    return res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

// ─── Update trip ──────────────────────────────────────────────────────────────

/**
 * PUT /api/trips/:userId/:tripId
 * Update trip status or satisfaction rating.
 * Body: { status?, overallSatisfaction? }
 */
exports.updateTrip = async (req, res, next) => {
  try {
    const { userId, tripId } = req.params;
    const { status, overallSatisfaction, itinerary } = req.body;

    const allowedFields = {};
    if (status) allowedFields.status = status;
    if (overallSatisfaction !== undefined) allowedFields.overallSatisfaction = overallSatisfaction;
    if (Array.isArray(itinerary)) allowedFields.itinerary = normalizeItinerary(itinerary);

    if (Object.keys(allowedFields).length === 0) {
      return res.status(400).json({ success: false, error: 'No updatable fields provided' });
    }

    const trip = await SavedTrip.findOneAndUpdate(
      { userId, tripId },
      { $set: allowedFields },
      { new: true, select: 'tripId status overallSatisfaction updatedAt' }
    );

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    return res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

// ─── Delete trip ──────────────────────────────────────────────────────────────

/**
 * DELETE /api/trips/:userId/:tripId
 */
exports.deleteTrip = async (req, res, next) => {
  try {
    const { userId, tripId } = req.params;
    const result = await SavedTrip.deleteOne({ userId, tripId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    return res.json({ success: true, message: 'Trip deleted' });
  } catch (err) {
    next(err);
  }
};

