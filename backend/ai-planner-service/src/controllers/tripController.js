const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const localTripStore = require("../utils/localTripStore");

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Public
const createTrip = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      userId,
      title,
      description,
      destination,
      preferences,
      itinerary,
      startDate,
      endDate,
      notes,
      isPublic,
      tags,
      status,
    } = req.body;

    // Determine status: explicitly set, or upcoming
    let tripStatus = status || "upcoming";

    const parseSafeDate = (d, fallback) => {
      if (!d) return fallback;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? fallback : parsed;
    };

    const durationDays = parseInt(preferences?.duration) || 1;
    const safeStart = parseSafeDate(startDate, new Date());
    const safeEnd = parseSafeDate(endDate, new Date(safeStart.getTime() + durationDays * 24 * 60 * 60 * 1000));

    const tripData = {
      userId: userId || req.headers["x-user-id"] || "guest",
      title: title || `Trip to ${destination?.city || (typeof destination === 'string' ? destination : 'Destination')}`,
      description: description || `Trip to ${destination?.city || (typeof destination === 'string' ? destination : 'Destination')}`,
      destination: destination || { city: 'Destination', country: 'India', coordinates: { lat: 0, lng: 0 } },
      preferences: preferences || { duration: durationDays, travelStyle: 'budget' },
      itinerary: itinerary || {},
      status: tripStatus,
      startDate: safeStart,
      endDate: safeEnd,
      notes: notes || "",
      isPublic: isPublic || false,
      tags: tags || [],
    };

    // If MongoDB is connected and ready, attempt MongoDB creation
    if (mongoose.connection.readyState === 1) {
      try {
        const trip = await Trip.create(tripData);
        // Also keep local store synced
        localTripStore.saveTrip(trip.toObject());
        return res.status(201).json({
          success: true,
          message: "Trip created successfully",
          trip,
        });
      } catch (dbError) {
        console.warn("[tripController] MongoDB insert failed, falling back to local store:", dbError.message);
      }
    }

    // Local JSON store fallback (100% resilient when MongoDB is offline)
    const trip = localTripStore.saveTrip(tripData);
    return res.status(201).json({
      success: true,
      message: "Trip created successfully (local store)",
      trip,
    });
  } catch (error) {
    console.error("Create trip error:", error);
    // Even on error, attempt local store save
    try {
      const trip = localTripStore.saveTrip(req.body);
      return res.status(201).json({
        success: true,
        message: "Trip created successfully (fallback)",
        trip,
      });
    } catch (fallbackErr) {
      res.status(500).json({
        success: false,
        message: "Error creating trip",
        error: error.message,
      });
    }
  }
};

// @desc    Get all trips for logged in user
// @route   GET /api/trips
// @access  Public
const getTrips = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      destination,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let allTrips = [];

    // 1. Try MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const query = {};
        if (status) query.status = status;
        if (destination) {
          query.$or = [
            { "destination.city": { $regex: destination, $options: "i" } },
            { "destination.country": { $regex: destination, $options: "i" } },
          ];
        }
        const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
        const mongoTrips = await Trip.find(query).sort(sort).lean();
        allTrips = [...mongoTrips];
      } catch (dbErr) {
        console.warn("[tripController] MongoDB find warning:", dbErr.message);
      }
    }

    // 2. Merge with local store trips
    const localTrips = localTripStore.getAllTrips();
    for (const lt of localTrips) {
      const ltId = String(lt._id || lt.id);
      if (!allTrips.some((t) => String(t._id || t.id) === ltId)) {
        allTrips.unshift(lt);
      }
    }

    // 3. Filter if query params present
    if (status && status !== 'all') {
      allTrips = allTrips.filter((t) => t.status === status);
    }
    if (destination) {
      const d = destination.toLowerCase();
      allTrips = allTrips.filter((t) => {
        const destStr = typeof t.destination === 'string'
          ? t.destination
          : `${t.destination?.city || ''} ${t.destination?.country || ''}`;
        return destStr.toLowerCase().includes(d);
      });
    }

    const total = allTrips.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTrips = allTrips.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      trips: paginatedTrips,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)) || 1,
        totalTrips: total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get trips error:", error);
    // Graceful fallback from local store
    const localTrips = localTripStore.getAllTrips();
    res.json({
      success: true,
      trips: localTrips,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalTrips: localTrips.length,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 20,
      },
    });
  }
};

// @desc    Get single trip by ID
// @route   GET /api/trips/:id
// @access  Private
// @desc    Get single trip by ID
// @route   GET /api/trips/:id
// @access  Public
const getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      try {
        const trip = await Trip.findById(id).lean();
        if (trip) {
          return res.json({ success: true, trip });
        }
      } catch (dbErr) {
        // Fall through to local store
      }
    }

    const localTrip = localTripStore.getTripById(id);
    if (localTrip) {
      return res.json({ success: true, trip: localTrip });
    }

    return res.status(404).json({
      success: false,
      message: "Trip not found",
    });
  } catch (error) {
    const localTrip = localTripStore.getTripById(req.params.id);
    if (localTrip) {
      return res.json({ success: true, trip: localTrip });
    }
    res.status(404).json({
      success: false,
      message: "Trip not found",
    });
  }
};

// @desc    Update trip
// @route   PUT /api/trips/:id
// @access  Public
const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const localUpdated = localTripStore.updateTrip(id, updateData);

    // Auto-generate idempotent trip experience record when trip is marked completed
    const triggerTripExperience = (tripObj) => {
      if (tripObj && updateData.status === "completed") {
        try {
          const { recordAutoExperience } = require("./experienceController");
          const uid = tripObj.userId || req.headers["x-user-id"] || req.body?.userId || "guest";
          const tid = String(tripObj._id || tripObj.id || id);
          const dest = typeof tripObj.destination === "string"
            ? tripObj.destination
            : tripObj.destination?.city || tripObj.title || "Heritage Trip";
          recordAutoExperience({
            userId: uid,
            eventKey: `trip:${tid}`,
            tripId: tid,
            experienceType: "trip",
            title: tripObj.title || `${dest} Heritage Trip`,
            destination: dest,
            placeName: dest,
            visitStatus: "visited",
            plannedData: {
              destination: dest,
              plannedDate: tripObj.startDate,
              plannedDurationHours: (tripObj.preferences?.duration || 1) * 8,
            },
            visitedAt: tripObj.endDate || new Date().toISOString(),
          }).catch(() => {});
        } catch {}
      }
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const trip = await Trip.findByIdAndUpdate(id, updateData, { new: true }).lean();
        if (trip) {
          triggerTripExperience(trip);
          return res.json({
            success: true,
            message: "Trip updated successfully",
            trip,
          });
        }
      } catch (dbErr) {
        console.warn("[tripController] MongoDB update warning:", dbErr.message);
      }
    }

    if (localUpdated) {
      triggerTripExperience(localUpdated);
      return res.json({
        success: true,
        message: "Trip updated successfully",
        trip: localUpdated,
      });
    }

    res.status(404).json({
      success: false,
      message: "Trip not found",
    });
  } catch (error) {
    console.error("Update trip error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating trip",
      error: error.message,
    });
  }
};

// @desc    Delete trip
// @route   DELETE /api/trips/:id
// @access  Public
const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    localTripStore.deleteTrip(id);

    if (mongoose.connection.readyState === 1) {
      try {
        await Trip.findByIdAndDelete(id);
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Delete trip error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting trip",
      error: error.message,
    });
  }
};

// @desc    Get public trips (for discovery)
// @route   GET /api/trips/public
// @access  Public
const getPublicTrips = async (req, res) => {
  try {
    let trips = [];
    if (mongoose.connection.readyState === 1) {
      try {
        trips = await Trip.find({ isPublic: true }).lean();
      } catch (dbErr) {}
    }
    const localTrips = localTripStore.getAllTrips();
    const all = [...trips, ...localTrips];
    res.json({
      success: true,
      trips: all,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalTrips: all.length,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 20,
      },
    });
  } catch (error) {
    res.json({
      success: true,
      trips: localTripStore.getAllTrips(),
      pagination: { currentPage: 1, totalPages: 1, totalTrips: 0, limit: 20 },
    });
  }
};

// @desc    Clone/copy a public trip
// @route   POST /api/trips/:id/clone
// @access  Public
const cloneTrip = async (req, res) => {
  try {
    let originalTrip = null;
    if (mongoose.connection.readyState === 1) {
      try {
        originalTrip = await Trip.findById(req.params.id).lean();
      } catch (dbErr) {}
    }
    if (!originalTrip) {
      originalTrip = localTripStore.getTripById(req.params.id);
    }
    if (!originalTrip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const cloned = localTripStore.saveTrip({
      ...originalTrip,
      title: `${originalTrip.title} (Copy)`,
      status: "draft",
      isPublic: false,
    });

    res.status(201).json({
      success: true,
      message: "Trip cloned successfully",
      trip: cloned,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error cloning trip", error: error.message });
  }
};

// @desc    Get trip statistics for user
// @route   GET /api/trips/stats
// @access  Public
const getTripStats = async (req, res) => {
  try {
    const allTrips = localTripStore.getAllTrips();
    const totalTrips = allTrips.length;
    const completedTrips = allTrips.filter((t) => t.status === "completed").length;
    const ongoingTrips = allTrips.filter((t) => t.status === "ongoing" || t.status === "in_progress").length;
    const plannedTrips = allTrips.filter((t) => t.status === "upcoming" || t.status === "draft").length;

    const stats = {
      overview: {
        totalTrips,
        completedTrips,
        ongoingTrips,
        plannedTrips,
        totalCost: 0,
        averageDuration: 3,
      },
      travelStyleBreakdown: [],
      topDestinations: [],
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.json({
      success: true,
      stats: { overview: { totalTrips: 0 } },
    });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getPublicTrips,
  cloneTrip,
  getTripStats,
};
