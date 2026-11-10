/**
 * research-service/src/middleware/validation.js
 *
 * Input validation middleware using express-validator.
 * Provides validators for all research-service endpoints.
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * handleValidationErrors — standard middleware to return 400 on validation failure.
 * Always attach this AFTER the validator array in the route definition.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Experience validators ────────────────────────────────────────────────────

const validateSiteFeedback = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('tripId').optional().isString(),
  body('payload.siteId').notEmpty().withMessage('payload.siteId is required'),
  body('payload.siteName').notEmpty().withMessage('payload.siteName is required'),
  body('payload.satisfactionRating')
    .isInt({ min: 1, max: 5 })
    .withMessage('satisfactionRating must be an integer between 1 and 5'),
  body('payload.activities').optional().isArray(),
  body('payload.feedbackTags').optional().isArray(),
  body('payload.notes').optional().isString().isLength({ max: 2000 }),
  body('payload.duration').optional().isInt({ min: 0, max: 1440 }),
  body('payload.timeOfDay').optional().isIn(['morning', 'afternoon', 'evening', 'night']),
  body('payload.crowdLevel').optional().isIn(['low', 'mid', 'high']),
  body('payload.companions').optional().isInt({ min: 0, max: 100 }),
  handleValidationErrors,
];

const validateTripReflection = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('tripId').notEmpty().withMessage('tripId is required'),
  body('payload.overallSatisfaction')
    .isInt({ min: 1, max: 5 })
    .withMessage('overallSatisfaction must be between 1 and 5'),
  body('payload.dimensionRatings').optional().isObject(),
  body('payload.bestMoment').optional().isString().isLength({ max: 500 }),
  body('payload.notes').optional().isString().isLength({ max: 3000 }),
  handleValidationErrors,
];

const validateGenericEvent = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('eventType')
    .isIn(['site_feedback', 'trip_reflection', 'search', 'bookmark', 'map_interaction', 'itinerary_modification', 'behavior'])
    .withMessage('Invalid eventType'),
  body('payload').isObject().withMessage('payload must be an object'),
  handleValidationErrors,
];

// ─── Query validators ─────────────────────────────────────────────────────────

const validateUserIdQuery = [
  query('userId').notEmpty().withMessage('userId query param is required'),
  handleValidationErrors,
];

const validateUserIdParam = [
  param('userId').notEmpty().withMessage('userId param is required'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateSiteFeedback,
  validateTripReflection,
  validateGenericEvent,
  validateUserIdQuery,
  validateUserIdParam,
};

