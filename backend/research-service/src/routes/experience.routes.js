/**
 * research-service/src/routes/experience.routes.js
 *
 * Routes for the experience/event ingestion subsystem.
 *
 * Base path: /api/research
 * (mounted at /api/research in index.js)
 */

const express = require('express');
const router = express.Router();
const experienceController = require('../controllers/experience.controller');
const {
  validateSiteFeedback,
  validateTripReflection,
  validateGenericEvent,
  validateUserIdParam,
} = require('../middleware/validation');

// ─── Experience recording endpoints ──────────────────────────────────────────

/**
 * POST /api/research/experiences
 * Record any generic travel event (search, bookmark, map_interaction, etc.)
 */
router.post('/experiences', validateGenericEvent, experienceController.recordEvent);

/**
 * POST /api/research/feedback
 * Record post-visit site feedback (convenience wrapper for eventType='site_feedback')
 *
 * Body: { userId, tripId?, payload: { siteId, siteName, satisfactionRating, ... } }
 */
router.post('/feedback', validateSiteFeedback, experienceController.recordSiteFeedback);

/**
 * POST /api/research/reflection
 * Record post-trip holistic reflection (eventType='trip_reflection')
 *
 * Body: { userId, tripId, payload: { overallSatisfaction, dimensionRatings, ... } }
 */
router.post('/reflection', validateTripReflection, experienceController.recordTripReflection);

/**
 * GET /api/research/experiences/:userId
 * Get paginated experience history for a user
 *
 * Query: limit (default 50), offset (default 0), eventType (optional)
 */
router.get('/experiences/:userId', validateUserIdParam, experienceController.getExperiences);

module.exports = router;

