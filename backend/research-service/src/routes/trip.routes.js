/**
 * research-service/src/routes/trip.routes.js
 *
 * REST endpoints for trip persistence.
 * Base path: /api/trips
 *
 * These endpoints replace localStorage('voh_saved_trips') in the frontend.
 */

const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');

/**
 * POST /api/trips
 * Save a newly generated trip to MongoDB.
 * Called by TripPlannerPage.tsx after generation succeeds.
 */
router.post('/', tripController.createTrip);

/**
 * GET /api/trips/:userId
 * Get all trips for a user (list view, no itinerary details).
 * Called by ProfilePage.tsx to show trip history.
 */
router.get('/:userId', tripController.getUserTrips);

/**
 * GET /api/trips/:userId/:tripId
 * Get full trip with itinerary details.
 * Called when user clicks "View" on a saved trip.
 */
router.get('/:userId/:tripId', tripController.getTrip);

/**
 * PUT /api/trips/:userId/:tripId
 * Update trip status or satisfaction rating.
 * Body: { status?, overallSatisfaction? }
 */
router.put('/:userId/:tripId', tripController.updateTrip);

/**
 * DELETE /api/trips/:userId/:tripId
 * Delete a saved trip.
 */
router.delete('/:userId/:tripId', tripController.deleteTrip);

module.exports = router;

