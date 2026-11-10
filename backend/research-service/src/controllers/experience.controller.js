/**
 * research-service/src/controllers/experience.controller.js
 *
 * Handles recording of travel experience events.
 * Receives raw user signals, persists them as TravelExperience documents,
 * and queues them for observation extraction.
 *
 * Pipeline after recording:
 *   recordEvent() → TravelExperience saved → triggerObservationExtraction()
 *   → Observation documents created → maybeRunConsolidation()
 *   → PreferenceSnapshot updated → PTKG updated
 */

const TravelExperience = require('../models/experience.model');
const { extractObservationsFromExperience } = require('../engine/observationExtractor');
const { maybeRunConsolidation } = require('../engine/consolidationEngine');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Trigger async observation extraction + consolidation.
 * Phase 6: extracts observations from raw experience event.
 * Phase 7: triggers consolidation (preference inference → PTKG update).
 */
async function triggerProcessing(experienceId, userId) {
  try {
    await extractObservationsFromExperience(experienceId);
    // Phase 7: auto-consolidate if threshold reached
    await maybeRunConsolidation(userId);
  } catch (err) {
    console.error(`[research] Processing failed for experience ${experienceId}:`, err.message);
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/research/experiences
 * Records any generic travel event (search, bookmark, map_interaction, etc.).
 */
exports.recordEvent = async (req, res, next) => {
  try {
    const { userId, tripId, eventType, payload, source } = req.body;

    const experience = await TravelExperience.create({
      userId,
      tripId: tripId || null,
      eventType,
      payload,
      source: source || 'implicit_behavior',
    });

    // Fire-and-forget processing (non-blocking)
    triggerProcessing(experience._id, userId).catch(err =>
      console.error('[research] Processing trigger failed:', err.message)
    );

    return res.status(201).json({
      success: true,
      experienceId: experience._id,
      message: 'Experience recorded',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/research/feedback
 * Records post-visit site feedback (the primary explicit signal).
 * Convenience endpoint that hardcodes eventType = 'site_feedback'.
 */
exports.recordSiteFeedback = async (req, res, next) => {
  try {
    const { userId, tripId, payload } = req.body;

    const experience = await TravelExperience.create({
      userId,
      tripId: tripId || null,
      eventType: 'site_feedback',
      payload,
      source: 'manual_feedback',
    });

    // Fire-and-forget processing
    triggerProcessing(experience._id, userId).catch(err =>
      console.error('[research] Feedback processing trigger failed:', err.message)
    );

    return res.status(201).json({
      success: true,
      experienceId: experience._id,
      message: 'Site feedback recorded',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/research/reflection
 * Records post-trip holistic reflection (key signal for preference consolidation).
 * Hardcodes eventType = 'trip_reflection'.
 */
exports.recordTripReflection = async (req, res, next) => {
  try {
    const { userId, tripId, payload } = req.body;

    const experience = await TravelExperience.create({
      userId,
      tripId,
      eventType: 'trip_reflection',
      payload,
      source: 'reflection',
    });

    // Fire-and-forget processing
    triggerProcessing(experience._id, userId).catch(err =>
      console.error('[research] Reflection processing trigger failed:', err.message)
    );

    return res.status(201).json({
      success: true,
      experienceId: experience._id,
      message: 'Trip reflection recorded',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/research/experiences/:userId
 * Returns paginated experience history for a user.
 * Query params: limit (default 50), offset (default 0), eventType (optional filter)
 */
exports.getExperiences = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const eventType = req.query.eventType;

    const filter = { userId };
    if (eventType) filter.eventType = eventType;

    const [experiences, total] = await Promise.all([
      TravelExperience.find(filter)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      TravelExperience.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      total,
      limit,
      offset,
      data: experiences,
    });
  } catch (err) {
    next(err);
  }
};

