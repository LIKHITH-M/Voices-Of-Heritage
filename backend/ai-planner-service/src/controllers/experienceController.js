const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Experience = require('../models/Experience');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const StayBooking = require('../models/StayBooking');
const WellnessInquiry = require('../models/WellnessInquiry');
const localExpStore = require('../utils/localExperienceStore');
const localTripStore = require('../utils/localTripStore');
const localBookingStore = require('../utils/localBookingStore');
const localStayStore = require('../utils/localStayStore');
const localWellnessStore = require('../utils/localWellnessStore');
const { extractExperienceKnowledge } = require('../services/experienceExtractor');
const { rebuildUserDEPKG, getExperienceContextForPlanner } = require('../services/depkgGraphBridge');

const isMongoConnected = () => mongoose.connection.readyState === 1;

// Helper: resolve authenticated userId from headers, query, or body
function resolveUserId(req) {
  return (
    req.headers['x-user-id'] ||
    req.user?.id ||
    req.query?.userId ||
    req.body?.userId ||
    null
  );
}

// Helper: save or upsert an experience to MongoDB (if online) + local persistent store
async function persistExperience(data) {
  const { record, created } = localExpStore.upsertExperience(data);

  if (isMongoConnected()) {
    try {
      const { _id, ...mongoSafe } = record;
      if (data.eventKey) {
        const doc = await Experience.findOneAndUpdate(
          { userId: data.userId, eventKey: data.eventKey },
          { $set: mongoSafe },
          { upsert: true, new: true }
        ).lean();
        return { record: doc || record, created };
      } else {
        const doc = await Experience.findOneAndUpdate(
          { experienceId: record.experienceId },
          { $set: mongoSafe },
          { upsert: true, new: true }
        ).lean();
        return { record: doc || record, created };
      }
    } catch (err) {
      console.warn('[Experience] MongoDB upsert fallback to local store:', err.message);
    }
  }
  return { record, created };
}

/**
 * Idempotent Auto-Collection Helper (called by Booking, Stay, Trip, Wellness services)
 * Never duplicates records for the same eventKey and never overwrites completed user feedback!
 */
async function recordAutoExperience({
  userId,
  eventKey,
  tripId = null,
  placeId = null,
  activityId = null,
  experienceType = 'place',
  title,
  destination = '',
  region = '',
  placeName = '',
  visitStatus = 'visited',
  plannedData = {},
  actualData = {},
  bookingData = {},
  weatherContext = null,
  foodDetails = null,
  wellnessDetails = null,
  moduleMetadata = {},
  visitedAt = new Date().toISOString(),
}) {
  if (!userId || !eventKey) return null;

  const existing = localExpStore.getByEventKey(userId, eventKey);
  if (existing && existing.feedbackStatus === 'completed') {
    // Preserve user's subjective feedback; only refresh objective booking/status metadata
    const merged = {
      ...existing,
      bookingData: { ...(existing.bookingData || {}), ...(bookingData || {}) },
      ...(weatherContext ? { weatherContext } : {}),
      ...(existing.visitStatus === 'planned' && visitStatus ? { visitStatus } : {}),
    };
    const { record } = await persistExperience(merged);
    return record;
  }

  const payload = {
    userId,
    eventKey,
    tripId: tripId || existing?.tripId || null,
    placeId: placeId || existing?.placeId || null,
    activityId: activityId || existing?.activityId || null,
    experienceType,
    title: title || placeName || destination || 'Heritage Experience',
    destination,
    region,
    placeName: placeName || title || destination,
    visitStatus: existing?.visitStatus && existing.visitStatus !== 'planned' ? existing.visitStatus : visitStatus,
    feedbackStatus: existing?.feedbackStatus || 'pending',
    sourceType: existing?.sourceType === 'user_submitted' ? 'hybrid' : 'auto_generated',
    plannedData: { ...(existing?.plannedData || {}), ...(plannedData || {}) },
    actualData: { ...(existing?.actualData || {}), ...(actualData || {}) },
    bookingData: { ...(existing?.bookingData || {}), ...(bookingData || {}) },
    ...(weatherContext ? { weatherContext } : existing?.weatherContext ? { weatherContext: existing.weatherContext } : {}),
    ...(foodDetails ? { foodDetails } : {}),
    ...(wellnessDetails ? { wellnessDetails } : {}),
    moduleMetadata: { ...(existing?.moduleMetadata || {}), ...(moduleMetadata || {}) },
    visitedAt: visitedAt || existing?.visitedAt || new Date().toISOString(),
  };

  const { record } = await persistExperience(payload);
  await rebuildUserDEPKG(userId).catch(() => {});
  return record;
}

/**
 * Fetch all trips belonging to user (merging MongoDB + localTripStore)
 */
async function fetchUserTrips(userId) {
  let trips = [];
  if (isMongoConnected()) {
    try {
      const mongoTrips = await Trip.find({
        $or: [{ userId }, { userId: { $exists: false } }, { userId: null }],
      })
        .sort({ createdAt: -1 })
        .lean();
      trips = [...mongoTrips];
    } catch {}
  }
  const localTrips = localTripStore.getAllTrips();
  for (const lt of localTrips) {
    if (lt.userId && lt.userId !== userId && lt.userId !== 'guest' && lt.userId !== 'anonymous') continue;
    const id = String(lt._id || lt.id);
    if (!trips.some((t) => String(t._id || t.id) === id)) {
      trips.push(lt);
    }
  }
  return trips;
}

/**
 * Automatically materialize idempotent experience records from:
 *   1. Completed Trips (all planned places/activities)
 *   2. Paid / Scanned ASI Monument Bookings
 *   3. Confirmed Smart Stay Bookings
 *   4. Wellness & Spiritual Inquiries
 */
async function syncAutoExperiencesForUser(userId, userEmail = null) {
  let syncedCount = 0;

  // 1. Monument Bookings (ASI Ticketing)
  let bookings = [];
  if (isMongoConnected()) {
    try {
      bookings = await Booking.find({ userId }).lean();
    } catch {
      bookings = localBookingStore.getBookingsByUserId(userId);
    }
  } else {
    bookings = localBookingStore.getBookingsByUserId(userId);
  }
  // Also include 'guest' bookings if user booked before setting voh_user_id
  const guestBookings = localBookingStore.getBookingsByUserId('guest');
  for (const gb of guestBookings) {
    if (userEmail && gb.email && gb.email.toLowerCase() === userEmail.toLowerCase()) {
      if (!bookings.some((b) => b.bookingId === gb.bookingId)) bookings.push(gb);
    }
  }

  for (const b of bookings) {
    if (!['paid', 'cancelled'].includes(b.paymentStatus)) continue;
    const visitStatus =
      b.paymentStatus === 'cancelled' || b.ticketStatus === 'cancelled'
        ? 'cancelled'
        : b.ticketStatus === 'scanned'
        ? 'visited'
        : 'visited';
    await recordAutoExperience({
      userId,
      eventKey: `booking:${b.bookingId}`,
      placeId: b.monumentId,
      experienceType: 'booking',
      title: b.monumentName || 'Monument Ticket',
      destination: b.site || b.monumentName || '',
      region: b.state || '',
      placeName: b.monumentName || b.site || '',
      visitStatus,
      plannedData: {
        destination: b.site || b.monumentName,
        placeName: b.monumentName,
        plannedDate: b.visitDate,
        plannedTime: b.timeSlot,
        estimatedCostINR: b.totalAmount,
        groupSize: b.numTickets || 1,
      },
      actualData: {
        destination: b.site || b.monumentName,
        placeName: b.monumentName,
        actualDate: b.visitDate,
        actualCostINR: b.totalAmount,
        groupSize: b.numTickets || 1,
      },
      bookingData: {
        bookingId: b.bookingId,
        sourceModule: 'asi_ticket',
        ticketType: b.ticketType || b.category,
        visitorType: b.nationality || 'indian',
        bookingStatus: b.ticketStatus === 'scanned' ? 'scanned' : b.paymentStatus,
        bookingDate: b.createdAt,
        visitDate: b.visitDate,
        ticketPriceINR: b.totalAmount,
      },
      visitedAt: b.scannedAt || b.visitDate || b.createdAt,
    });
    syncedCount++;
  }

  // 2. Smart Stay Bookings
  let stays = [];
  if (isMongoConnected()) {
    try {
      stays = await StayBooking.find({ userId }).lean();
    } catch {
      stays = localStayStore.getStayBookingsByUserId(userId);
    }
  } else {
    stays = localStayStore.getStayBookingsByUserId(userId);
  }
  for (const s of stays) {
    await recordAutoExperience({
      userId,
      eventKey: `stay:${s.bookingId}`,
      placeId: s.hotelId,
      experienceType: 'stay',
      title: s.hotelName,
      destination: s.hotelCity || '',
      placeName: s.hotelName,
      visitStatus: s.paymentStatus === 'cancelled' ? 'cancelled' : 'visited',
      plannedData: {
        destination: s.hotelCity,
        placeName: s.hotelName,
        plannedDate: s.checkIn,
        estimatedCostINR: s.totalAmount,
        groupSize: s.numGuests || 2,
      },
      actualData: {
        destination: s.hotelCity,
        placeName: s.hotelName,
        actualDate: s.checkIn,
        actualCostINR: s.totalAmount,
        groupSize: s.numGuests || 2,
      },
      bookingData: {
        bookingId: s.bookingId,
        sourceModule: 'smart_stay',
        ticketType: s.roomType,
        bookingStatus: s.paymentStatus,
        bookingDate: s.createdAt,
        visitDate: s.checkIn,
        ticketPriceINR: s.totalAmount,
      },
      moduleMetadata: {
        hotelId: s.hotelId,
        hotelName: s.hotelName,
        location: s.hotelCity,
        roomType: s.roomType,
        priceTotal: s.totalAmount,
      },
      visitedAt: s.checkIn || s.createdAt,
    });
    syncedCount++;
  }

  // 3. Wellness Inquiries
  let wellnessItems = [];
  if (isMongoConnected() && userEmail) {
    try {
      wellnessItems = await WellnessInquiry.find({ email: userEmail.toLowerCase() }).lean();
    } catch {
      wellnessItems = localWellnessStore.listInquiries(userEmail);
    }
  } else if (userEmail) {
    wellnessItems = localWellnessStore.listInquiries(userEmail);
  }
  for (const w of wellnessItems) {
    await recordAutoExperience({
      userId,
      eventKey: `wellness:${w.inquiryId}`,
      experienceType: 'wellness',
      title: w.site || 'Wellness & Spiritual Experience',
      placeName: w.site || 'Wellness Sanctuary',
      visitStatus: 'visited',
      bookingData: {
        bookingId: w.inquiryId,
        sourceModule: 'wellness',
        bookingStatus: w.status || 'received',
        bookingDate: w.createdAt,
        visitDate: w.dates || '',
      },
      wellnessDetails: {
        experienceSubType: w.category || 'Retreat',
      },
      visitedAt: w.createdAt,
    });
    syncedCount++;
  }

  return syncedCount;
}

// ─── REST ENDPOINTS ──────────────────────────────────────────────────────────

// GET /api/experiences
exports.listExperiences = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const { tripId, experienceType, feedbackStatus } = req.query;
    let items = [];

    if (isMongoConnected()) {
      try {
        const filter = { userId };
        if (tripId) filter.tripId = tripId;
        if (experienceType) filter.experienceType = experienceType;
        if (feedbackStatus) filter.feedbackStatus = feedbackStatus;
        items = await Experience.find(filter).sort({ updatedAt: -1, createdAt: -1 }).lean();
      } catch {
        items = localExpStore.getAllByUser(userId, { tripId, experienceType, feedbackStatus });
      }
    } else {
      items = localExpStore.getAllByUser(userId, { tripId, experienceType, feedbackStatus });
    }

    return res.json({ success: true, count: items.length, experiences: items });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/experiences/:id (Ownership Validated)
exports.getExperienceById = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const { id } = req.params;
    let exp = null;
    if (isMongoConnected()) {
      try {
        exp = await Experience.findOne({ $or: [{ experienceId: id }, { _id: mongoose.isValidObjectId(id) ? id : undefined }] }).lean();
      } catch {}
    }
    if (!exp) exp = localExpStore.getById(id);
    if (!exp) return res.status(404).json({ success: false, error: 'Experience not found' });

    if (exp.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied: you can only view your own experiences.' });
    }

    return res.json({ success: true, experience: exp });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/experiences/trip/:tripId
// Reconciles the Trip's planned itinerary with actual visit statuses, linked bookings, stays, weather, and feedback!
exports.getTripExperiences = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const { tripId } = req.params;

    // 1. Load trip
    let trip = null;
    if (isMongoConnected()) {
      try {
        if (mongoose.isValidObjectId(tripId)) trip = await Trip.findById(tripId).lean();
      } catch {}
    }
    if (!trip) trip = localTripStore.getTripById(tripId);

    // 2. Load existing experiences for this trip
    let existingExps = localExpStore.getAllByUser(userId, { tripId });
    if (isMongoConnected()) {
      try {
        const mongoExps = await Experience.find({ userId, tripId }).lean();
        if (mongoExps.length > existingExps.length) existingExps = mongoExps;
      } catch {}
    }

    // 3. Load user's bookings & stays to auto-link by monument/destination match
    const userBookings = localBookingStore.getBookingsByUserId(userId);
    const userStays = localStayStore.getStayBookingsByUserId(userId);

    // 4. Construct itinerary items from trip days (preserving planned vs actual distinction)
    const days = trip?.itinerary?.days || trip?.itinerary?.itinerary || [];
    const destCity = typeof trip?.destination === 'string'
      ? trip.destination
      : trip?.destination?.city || trip?.title || '';

    const itineraryItems = [];
    for (let dIdx = 0; dIdx < days.length; dIdx++) {
      const dayObj = days[dIdx];
      const activities = dayObj.activities || [];
      for (let aIdx = 0; aIdx < activities.length; aIdx++) {
        const act = activities[aIdx];
        const actName = act.activity || act.name || `Activity ${aIdx + 1}`;
        const placeName = act.location?.name || actName;
        const itemKey = `trip:${tripId}:d${dayObj.day || dIdx + 1}:a${aIdx}`;

        // Find matching feedback experience
        const matchedExp = existingExps.find(
          (e) => e.eventKey === itemKey || e.activityId === itemKey || (e.placeName && e.placeName.toLowerCase() === placeName.toLowerCase())
        );

        // Auto-match existing ASI booking if any
        const matchedBooking = userBookings.find(
          (b) =>
            (b.monumentName && placeName.toLowerCase().includes(b.monumentName.toLowerCase().slice(0, 10))) ||
            (b.site && destCity && b.site.toLowerCase().includes(destCity.toLowerCase()))
        );

        itineraryItems.push({
          itemKey,
          day: dayObj.day || dIdx + 1,
          dayTitle: dayObj.title || `Day ${dIdx + 1}`,
          placeName,
          activityName: actName,
          activityType: act.type || 'attraction',
          plannedTime: act.time || '09:00',
          plannedDurationHours: act.duration || 2,
          estimatedCostINR: act.cost?.amount || 0,
          description: act.description || '',
          heritageNote: act.heritage_note || '',
          siteId: act.siteId || null,
          visitStatus: matchedExp?.visitStatus || (matchedBooking?.ticketStatus === 'scanned' ? 'visited' : 'planned'),
          feedbackStatus: matchedExp?.feedbackStatus || 'pending',
          bookingStatus: matchedExp?.bookingData?.bookingStatus || matchedBooking?.paymentStatus || 'not_booked',
          linkedBooking: matchedBooking
            ? {
                bookingId: matchedBooking.bookingId,
                monumentName: matchedBooking.monumentName,
                ticketType: matchedBooking.ticketType,
                visitorType: matchedBooking.nationality,
                visitDate: matchedBooking.visitDate,
                ticketPriceINR: matchedBooking.totalAmount,
                bookingStatus: matchedBooking.ticketStatus === 'scanned' ? 'scanned' : matchedBooking.paymentStatus,
              }
            : null,
          experience: matchedExp || null,
        });
      }
    }

    // Include linked stays & extra non-itinerary experiences attached to this trip (e.g., food / wellness / custom)
    const linkedStays = userStays.filter(
      (s) => destCity && s.hotelCity && s.hotelCity.toLowerCase().includes(destCity.toLowerCase())
    );
    const extraExperiences = existingExps.filter(
      (e) => !itineraryItems.some((item) => item.experience?.experienceId === e.experienceId)
    );

    const tripLevelExp = existingExps.find((e) => e.experienceType === 'trip') || null;

    return res.json({
      success: true,
      tripId,
      trip: trip || null,
      tripExperience: tripLevelExp,
      itineraryItems,
      linkedStays,
      extraExperiences,
      totalItems: itineraryItems.length,
      completedFeedbackCount: itineraryItems.filter((i) => i.feedbackStatus === 'completed').length,
    });
  } catch (err) {
    console.error('[Experience] getTripExperiences error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/experiences — Create or update an experience, extract structured knowledge, update DEPKG
exports.createExperience = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const body = req.body || {};
    const title = body.title || body.placeName || body.foodDetails?.dish || body.destination;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title or placeName is required.' });
    }

    // Run knowledge extraction on free-text + structured fields
    const extracted = await extractExperienceKnowledge({
      freeText: body.freeTextFeedback || '',
      placeName: body.placeName || title,
      ratings: body.ratings || {},
      enjoyedTags: body.enjoyedTags || [],
      dislikedTags: body.dislikedTags || [],
      nextTimePreferences: body.nextTimePreferences || [],
      foodDetails: body.foodDetails || null,
      wellnessDetails: body.wellnessDetails || null,
      experienceType: body.experienceType || 'place',
    });

    const hasSubjectiveInput = Boolean(
      body.ratings?.overall ||
        (body.freeTextFeedback && body.freeTextFeedback.trim()) ||
        (body.enjoyedTags && body.enjoyedTags.length) ||
        (body.dislikedTags && body.dislikedTags.length) ||
        (body.nextTimePreferences && body.nextTimePreferences.length) ||
        ['not_visited', 'cancelled', 'could_not_visit'].includes(body.visitStatus)
    );

    const expData = {
      experienceId: body.experienceId || `EXP_${Date.now()}_${uuidv4().slice(0, 8).toUpperCase()}`,
      eventKey: body.eventKey || undefined,
      userId,
      tripId: body.tripId || null,
      placeId: body.placeId || null,
      activityId: body.activityId || null,
      experienceType: body.experienceType || 'place',
      title,
      destination: body.destination || '',
      region: body.region || body.foodDetails?.region || '',
      placeName: body.placeName || title,
      visitStatus: body.visitStatus || 'visited',
      feedbackStatus: body.feedbackStatus || (hasSubjectiveInput ? 'completed' : 'pending'),
      sourceType: body.sourceType || 'user_submitted',
      plannedData: body.plannedData || {},
      actualData: body.actualData || {},
      bookingData: body.bookingData || {},
      weatherContext: body.weatherContext || undefined,
      ratings: body.ratings || {},
      wouldVisitAgain: body.wouldVisitAgain ?? null,
      wouldRecommend: body.wouldRecommend ?? null,
      enjoyedTags: body.enjoyedTags || [],
      dislikedTags: body.dislikedTags || [],
      nextTimePreferences: body.nextTimePreferences || [],
      foodDetails: body.foodDetails || undefined,
      wellnessDetails: body.wellnessDetails || undefined,
      moduleMetadata: body.moduleMetadata || {},
      freeTextFeedback: body.freeTextFeedback || '',
      positiveSignals: extracted.positives,
      negativeSignals: extracted.negatives,
      extractedKnowledge: extracted,
      sentiment: extracted.sentiment,
      confidence: extracted.confidence,
      visitedAt: body.visitedAt || new Date().toISOString(),
    };

    const { record } = await persistExperience(expData);

    // Update DEPKG / PTKG immediately
    const graphSnapshot = await rebuildUserDEPKG(userId);

    return res.status(201).json({
      success: true,
      message: 'Experience recorded, structured knowledge extracted, and DEPKG updated.',
      experience: record,
      extractedKnowledge: extracted,
      graphSummary: {
        likedCount: graphSnapshot.liked.length,
        avoidedCount: graphSnapshot.avoided.length,
        factsCount: graphSnapshot.knowledgeLayers.facts.length,
        inferencesCount: graphSnapshot.knowledgeLayers.inferences.length,
      },
    });
  } catch (err) {
    console.error('[Experience] createExperience error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/experiences/:id — Edit/correct feedback (Ownership Validated) + Rebuild DEPKG
exports.updateExperience = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const { id } = req.params;
    let existing = localExpStore.getById(id);
    if (!existing && isMongoConnected()) {
      try {
        existing = await Experience.findOne({ experienceId: id }).lean();
      } catch {}
    }
    if (!existing) return res.status(404).json({ success: false, error: 'Experience not found' });
    if (existing.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied: cannot modify another user’s experience.' });
    }

    const merged = {
      ...existing,
      ...req.body,
      userId: existing.userId,
      experienceId: existing.experienceId,
      ratings: { ...(existing.ratings || {}), ...(req.body.ratings || {}) },
      plannedData: { ...(existing.plannedData || {}), ...(req.body.plannedData || {}) },
      actualData: { ...(existing.actualData || {}), ...(req.body.actualData || {}) },
      bookingData: { ...(existing.bookingData || {}), ...(req.body.bookingData || {}) },
    };

    const extracted = await extractExperienceKnowledge({
      freeText: merged.freeTextFeedback || '',
      placeName: merged.placeName || merged.title,
      ratings: merged.ratings || {},
      enjoyedTags: merged.enjoyedTags || [],
      dislikedTags: merged.dislikedTags || [],
      nextTimePreferences: merged.nextTimePreferences || [],
      foodDetails: merged.foodDetails || null,
      wellnessDetails: merged.wellnessDetails || null,
      experienceType: merged.experienceType || 'place',
    });

    merged.positiveSignals = extracted.positives;
    merged.negativeSignals = extracted.negatives;
    merged.extractedKnowledge = extracted;
    merged.sentiment = extracted.sentiment;
    merged.confidence = extracted.confidence;
    merged.feedbackStatus = 'completed';

    localExpStore.updateById(existing.experienceId, merged);
    if (isMongoConnected()) {
      try {
        const { _id, ...mongoSafe } = merged;
        await Experience.findOneAndUpdate({ experienceId: existing.experienceId }, { $set: mongoSafe });
      } catch {}
    }

    const graphSnapshot = await rebuildUserDEPKG(userId);

    return res.json({
      success: true,
      message: 'Experience updated and DEPKG recalculated.',
      experience: merged,
      extractedKnowledge: extracted,
      graphSummary: {
        likedCount: graphSnapshot.liked.length,
        avoidedCount: graphSnapshot.avoided.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/experiences/:id — Delete experience (Ownership Validated) + Rebuild DEPKG
exports.deleteExperience = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const { id } = req.params;
    let existing = localExpStore.getById(id);
    if (!existing && isMongoConnected()) {
      try {
        existing = await Experience.findOne({ experienceId: id }).lean();
      } catch {}
    }
    if (!existing) return res.status(404).json({ success: false, error: 'Experience not found' });
    if (existing.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied: cannot delete another user’s experience.' });
    }

    localExpStore.deleteById(existing.experienceId);
    if (isMongoConnected()) {
      try {
        await Experience.findOneAndDelete({ experienceId: existing.experienceId });
      } catch {}
    }

    const graphSnapshot = await rebuildUserDEPKG(userId);

    return res.json({
      success: true,
      message: 'Experience deleted and DEPKG preferences recalculated.',
      graphSummary: {
        likedCount: graphSnapshot.liked.length,
        avoidedCount: graphSnapshot.avoided.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/experiences/extract — Live structured extraction preview
exports.extractFeedback = async (req, res) => {
  try {
    const extracted = await extractExperienceKnowledge(req.body || {});
    return res.json({ success: true, extractedKnowledge: extracted });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/experiences/graph-update — Rebuild DEPKG graph for user
exports.triggerGraphUpdate = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const graph = await rebuildUserDEPKG(userId);
    return res.json({ success: true, message: 'DEPKG graph updated.', graph });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/experiences/auto-sync — Auto-generate experiences from existing bookings, stays, wellness, trips
exports.autoSync = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });
    const userEmail = req.body?.email || req.query?.email || null;
    const syncedCount = await syncAutoExperiencesForUser(userId, userEmail);
    const graph = await rebuildUserDEPKG(userId);
    return res.json({ success: true, syncedCount, graph });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/experiences/preferences — Structured DEPKG Preferences, Facts, Inferences & Explainability
exports.getPreferences = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const graph = (await getExperienceContextForPlanner(userId)) || (await rebuildUserDEPKG(userId));
    return res.json({
      success: true,
      userId,
      updatedAt: graph.updatedAt,
      knowledgeLayers: graph.knowledgeLayers,
      liked: graph.liked,
      avoided: graph.avoided,
      evolution: graph.evolution,
      compressedContext: graph.compressedContext,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/experiences/summary — Experiences Dashboard Summary
exports.getSummary = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication / userId required' });

    const userEmail = req.query?.email || null;
    await syncAutoExperiencesForUser(userId, userEmail).catch(() => {});

    const graph = await rebuildUserDEPKG(userId);
    const experiences = localExpStore.getAllByUser(userId);
    const trips = await fetchUserTrips(userId);

    const completedTrips = trips.filter((t) => t.status === 'completed');
    const visitedPlaces = new Set(
      graph.knowledgeLayers.facts
        .filter((f) => ['visited', 'partially_visited', 'different_from_planned'].includes(f.predicate))
        .map((f) => f.object)
    );

    const completedFeedbacks = experiences.filter((e) => e.feedbackStatus === 'completed');

    // Enrich trips with summary info (place count, activity count, submitted rating, feedback progress)
    const enrichedTrips = trips.map((t) => {
      const tid = String(t._id || t.id);
      const days = t.itinerary?.days || t.itinerary?.itinerary || [];
      const activities = days.flatMap((d) => d.activities || []);
      const uniquePlaces = new Set(activities.map((a) => a.location?.name || a.activity).filter(Boolean));
      const tripExps = experiences.filter((e) => e.tripId === tid);
      const ratings = tripExps.map((e) => Number(e.ratings?.overall || 0)).filter((r) => r > 0);
      const avgRating = ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : null;

      return {
        _id: tid,
        title: t.title || `Trip to ${typeof t.destination === 'string' ? t.destination : t.destination?.city || 'Heritage'}`,
        destination: typeof t.destination === 'string' ? t.destination : `${t.destination?.city || ''}${t.destination?.country ? ', ' + t.destination.country : ''}`,
        startDate: t.startDate,
        endDate: t.endDate,
        duration: t.preferences?.duration || days.length || 1,
        placesCount: uniquePlaces.size || days.length,
        activitiesCount: activities.length,
        status: t.status || 'upcoming',
        overallRating: avgRating,
        feedbackCompletedCount: tripExps.filter((e) => e.feedbackStatus === 'completed').length,
      };
    });

    const topInterests = graph.liked
      .filter((p) => ['interest', 'cuisine', 'wellness', 'atmosphere'].includes(p.dimension))
      .slice(0, 6);

    const prefers = graph.liked.slice(0, 8);
    const avoids = graph.avoided.slice(0, 6);

    return res.json({
      success: true,
      stats: {
        tripsCompleted: completedTrips.length,
        totalTrips: trips.length,
        placesVisited: visitedPlaces.size,
        experiencesRecorded: completedFeedbacks.length,
        pendingExperiences: experiences.filter((e) => e.feedbackStatus === 'pending').length,
        factsCount: graph.knowledgeLayers.facts.length,
        preferencesCount: graph.knowledgeLayers.preferences.length,
        inferencesCount: graph.knowledgeLayers.inferences.length,
      },
      topInterests,
      prefers,
      avoids,
      inferences: graph.knowledgeLayers.inferences.slice(0, 6),
      evolution: graph.evolution,
      recentExperiences: experiences.slice(0, 12),
      trips: enrichedTrips,
    });
  } catch (err) {
    console.error('[Experience] getSummary error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.recordAutoExperience = recordAutoExperience;
exports.syncAutoExperiencesForUser = syncAutoExperiencesForUser;
