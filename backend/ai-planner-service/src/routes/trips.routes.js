const express = require("express");
const { body } = require("express-validator");
const {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getPublicTrips,
  cloneTrip,
  getTripStats,
} = require("../controllers/tripController");

const router = express.Router();

// Normalization middleware to accept both string & object destinations, flat or nested preferences
const normalizeTripPayload = (req, res, next) => {
  if (req.body) {
    // 1. Destination normalization: string -> { city, country, coordinates }
    if (typeof req.body.destination === 'string') {
      const parts = req.body.destination.split(',').map((s) => s.trim());
      req.body.destination = {
        city: parts[0] || req.body.destination || 'Destination',
        country: parts[1] || 'India',
        coordinates: { lat: 0, lng: 0 },
      };
    } else if (req.body.destination && typeof req.body.destination === 'object') {
      if (!req.body.destination.city) {
        req.body.destination.city = req.body.destination.name || 'Destination';
      }
      if (!req.body.destination.country) {
        req.body.destination.country = 'India';
      }
    } else {
      req.body.destination = { city: 'Destination', country: 'India', coordinates: { lat: 0, lng: 0 } };
    }

    // 2. Preferences normalization
    if (!req.body.preferences || typeof req.body.preferences !== 'object') {
      req.body.preferences = {};
    }
    if (req.body.duration && !req.body.preferences.duration) {
      req.body.preferences.duration = parseInt(req.body.duration) || 1;
    }
    if (!req.body.preferences.duration) {
      req.body.preferences.duration = 1;
    }
    if (req.body.budget && !req.body.preferences.budget) {
      req.body.preferences.budget = req.body.budget;
    }

    // 3. Title fallback
    if (!req.body.title) {
      req.body.title = `Trip to ${req.body.destination.city}`;
    }
  }
  next();
};

// Validation middleware
const tripValidation = [
  body("title")
    .optional()
    .trim(),
  body("destination.city")
    .optional()
    .trim(),
  body("destination.country")
    .optional()
    .trim(),
];

const updateTripValidation = [
  body("title")
    .optional()
    .trim(),
];

// @route   GET /api/trips/public
// @desc    Get public trips for discovery
// @access  Public
router.get("/public", getPublicTrips);

// @route   GET /api/trips/stats
// @desc    Get trip statistics for current user
// @access  Public
router.get("/stats", getTripStats);

// @route   GET /api/trips
// @desc    Get all trips for logged in user
// @access  Public
router.get("/", getTrips);

// @route   POST /api/trips
// @desc    Create a new trip
// @access  Public
router.post("/", normalizeTripPayload, tripValidation, createTrip);

// @route   GET /api/trips/:id
// @desc    Get single trip by ID
// @access  Public
router.get("/:id", getTripById);

// @route   PUT /api/trips/:id
// @desc    Update trip
// @access  Public
router.put("/:id", updateTripValidation, updateTrip);

// @route   DELETE /api/trips/:id
// @desc    Delete trip
// @access  Public
router.delete("/:id", deleteTrip);

// @route   POST /api/trips/:id/clone
// @desc    Clone a trip (public or owned)
// @access  Public
router.post("/:id/clone", cloneTrip);

// @route   GET /api/trips/upcoming
// @desc    Get upcoming trips
// @access  Private
router.get("/upcoming", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const now = new Date();

    const Trip = require("../models/Trip");
    const trips = await Trip.find({
      startDate: { $gte: now },
      status: { $in: ["draft", "upcoming"] },
    })
      .sort({ startDate: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: trips.length,
      trips,
    });
  } catch (error) {
    console.error("Get upcoming trips error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching upcoming trips",
    });
  }
});

// @route   GET /api/trips/past
// @desc    Get past trips
// @access  Private
router.get("/past", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const now = new Date();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const Trip = require("../models/Trip");
    const trips = await Trip.find({
      endDate: { $lt: now },
      status: { $in: ["completed", "cancelled"] },
    })
      .sort({ endDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Trip.countDocuments({
      endDate: { $lt: now },
      status: { $in: ["completed", "cancelled"] },
    });

    res.json({
      success: true,
      count: trips.length,
      total,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + trips.length < total,
        hasPrev: parseInt(page) > 1,
      },
      trips,
    });
  } catch (error) {
    console.error("Get past trips error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching past trips",
    });
  }
});

module.exports = router;
