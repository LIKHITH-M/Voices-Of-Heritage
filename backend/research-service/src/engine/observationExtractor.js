/**
 * research-service/src/engine/observationExtractor.js
 *
 * Converts raw TravelExperience documents into structured Observation documents.
 *
 * This is the bridge between user-facing feedback (ratings, tags, notes)
 * and the mathematical preference inference engine (inferenceEngine.js).
 *
 * Core algorithm:
 *   For each TravelExperience:
 *     1. Determine the signed score from satisfactionRating: (rating - 3) / 2
 *     2. Look up heritage site attributes (arch_style, dynasty, period, etc.)
 *        from the HeritageSite collection using siteId
 *     3. Extract contextual signals (time_of_day, crowd_level, transport_mode)
 *        from the event payload
 *     4. Create one Observation per (dimension, value) pair
 *     5. Mark the TravelExperience as processed
 *
 * Example output for Hampi visit (rating=5, morning, low crowd, car):
 *   { dimension: 'arch_style',      value: 'Vijayanagara',  signedScore: +1.0 }
 *   { dimension: 'arch_style',      value: 'Chalukyan',     signedScore: +1.0 }
 *   { dimension: 'site_category',   value: 'Ruins',         signedScore: +1.0 }
 *   { dimension: 'heritage_region', value: 'Karnataka',     signedScore: +1.0 }
 *   { dimension: 'time_of_day',     value: 'morning',       signedScore: +1.0 }
 *   { dimension: 'crowd_level',     value: 'low',           signedScore: +1.0 }
 *   { dimension: 'transport_mode',  value: 'car',           signedScore: +1.0 }
 *   { dimension: 'activity',        value: 'Photography',   signedScore: +1.0 }
 */

const TravelExperience = require('../models/experience.model');
const Observation = require('../models/observation.model');
const SavedTrip = require('../models/trip.model');

// HeritageSite model for enriching observations with site attributes
const HeritageSite = require('../models/heritageSite.model');

const { DIMENSIONS } = require('../config/default');

// ─── Helper: compute signed score from 1-5 rating ────────────────────────────

function computeSignedScore(rating) {
  return (rating - 3) / 2;  // 1→-1, 2→-0.5, 3→0, 4→+0.5, 5→+1
}

function extractFeedbackSignals(payload, signedScore) {
  const result = [];
  const text = `${payload.notes || ''} ${(payload.feedbackTags || []).join(' ')}`.toLowerCase();
  const add = (dimension, value, score) => result.push({ dimension, value, signedScore: score });

  // Keep these rules conservative; the raw feedback remains the provenance.
  if (/crowd|overcrowd|busy/.test(text)) add('crowd_level', 'high', -0.6);
  if (/peaceful|quiet|uncrowded/.test(text)) add('crowd_level', 'low', 0.6);
  if (/architecture|architectural|carving|sculpture/.test(text)) {
    const positive = /beautiful|stunning|amazing|excellent|loved|impressive/.test(text);
    const negative = /poor|disappoint|unimpressive|bad/.test(text);
    add('activity', 'Architecture', positive ? 0.6 : negative ? -0.6 : signedScore);
  }
  if (/too much walking|long walk|difficult walk|walking difficulty/.test(text)) add('activity', 'Walking', -0.6);
  if (/photogenic|photography/.test(text)) add('activity', 'Photography', 0.6);
  if (/great guide|helpful guide/.test(text)) add('activity', 'Guided Tour', 0.6);
  if (/kid.?friendly|family friendly/.test(text)) add('companion_type', 'family', 0.6);
  if (/overpriced|too expensive/.test(text)) add('budget_range', 'expensive', -0.6);
  if (/value.for.money/.test(text)) add('budget_range', 'value', 0.6);
  return result;
}

function extractModificationSignals(payload) {
  const observations = [];
  const previous = payload.originalRecommendation || payload.monumentName;
  const selected = payload.selectedChoice;
  const reason = String(payload.reason || '').toLowerCase();
  if (payload.action === 'edit_activity' && selected && selected !== previous) {
    observations.push({ dimension: 'activity', value: selected, signedScore: 0.25 });
  }
  if (/crowd|overcrowd|too busy/.test(reason)) observations.push({ dimension: 'crowd_level', value: 'high', signedScore: -0.6 });
  if (/walk|walking|stairs|mobility/.test(reason)) observations.push({ dimension: 'activity', value: 'Walking', signedScore: -0.6 });
  if (/expensive|price|budget|cost/.test(reason)) observations.push({ dimension: 'budget_range', value: 'expensive', signedScore: -0.6 });
  if (/rushed|too packed|too many/.test(reason)) observations.push({ dimension: 'pace', value: 'packed', signedScore: -0.6 });
  return observations;
}

// ─── Helper: get trip index for a user (sequential trip number) ──────────────

async function getTripIndex(userId, tripId) {
  if (!tripId) return 1;
  try {
    const trip = await SavedTrip.findOne({ userId, tripId }).select('tripIndex').lean();
    return trip?.tripIndex || 1;
  } catch {
    return 1;
  }
}

// ─── Helper: load site attributes from MongoDB ───────────────────────────────

async function loadSiteAttributes(siteId) {
  if (!siteId) return null;
  try {
    const mongoose = require('mongoose');
    // Query the HeritageSite collection directly (shared database)
    const site = await mongoose.connection.db.collection('heritagesites').findOne(
      { siteId: siteId },
      { projection: { archStyle: 1, period: 1, dynasty: 1, siteCategory: 1, region: 1, localCuisine: 1 } }
    );
    return site;
  } catch {
    return null;
  }
}

// ─── Main extraction function ─────────────────────────────────────────────────

/**
 * extractObservationsFromExperience(experienceId)
 *
 * Loads a TravelExperience, extracts observations, saves them, marks as processed.
 * Returns array of created Observation documents.
 */
async function extractObservationsFromExperience(experienceId) {
  const experience = await TravelExperience.findById(experienceId).lean();
  if (!experience) throw new Error(`Experience ${experienceId} not found`);
  if (experience.processed) {
    console.log(`[extractor] Experience ${experienceId} already processed — skipping`);
    return [];
  }

  const { userId, tripId, eventType, payload } = experience;
  const tripIndex = await getTripIndex(userId, tripId);
  const observations = [];

  // ── Handle site_feedback ──────────────────────────────────────────────────
  if (eventType === 'site_feedback') {
    const rating = payload.satisfactionRating;
    if (!rating || rating < 1 || rating > 5) {
      console.warn(`[extractor] Invalid rating for experience ${experienceId}`);
      return [];
    }
    const signedScore = computeSignedScore(rating);

    // Load site attributes from MongoDB
    const site = await loadSiteAttributes(payload.siteId);

    // Extract from site attributes (heritage ontology dimensions)
    if (site) {
      for (const style of (site.archStyle || [])) {
        observations.push({ dimension: 'arch_style', value: style, signedScore });
      }
      for (const period of (site.period || [])) {
        observations.push({ dimension: 'period', value: period, signedScore });
      }
      for (const dynasty of (site.dynasty || [])) {
        observations.push({ dimension: 'dynasty', value: dynasty, signedScore });
      }
      if (site.siteCategory) {
        observations.push({ dimension: 'site_category', value: site.siteCategory, signedScore });
      }
      if (site.region) {
        observations.push({ dimension: 'heritage_region', value: site.region, signedScore });
      }
      for (const cuisine of (site.localCuisine || [])) {
        observations.push({ dimension: 'cuisine', value: cuisine, signedScore });
      }
    } else {
      // Fallback: use siteName-based heuristics
      console.log(`[extractor] Site not found in DB for siteId=${payload.siteId}, using payload data only`);
    }

    // Extract from visit context (direct payload fields)
    if (payload.timeOfDay) {
      observations.push({ dimension: 'time_of_day', value: payload.timeOfDay, signedScore });
    }
    if (payload.crowdLevel) {
      // Invert crowd signal: if crowd was high and rating was low, that's meaningful
      // If crowd was high and rating was high, traveler tolerates crowds
      observations.push({ dimension: 'crowd_level', value: payload.crowdLevel, signedScore });
    }
    if (payload.transportMode) {
      observations.push({ dimension: 'transport_mode', value: payload.transportMode, signedScore });
    }

    // Extract from activities performed
    for (const activity of (payload.activities || [])) {
      observations.push({ dimension: 'activity', value: activity, signedScore });
    }
    observations.push(...extractFeedbackSignals(payload, signedScore));

    // Extract companion type from trip data
    if (tripId) {
      try {
        const trip = await SavedTrip.findOne({ userId, tripId }).select('travelStyle travelers').lean();
        if (trip?.travelStyle) {
          const companionMap = {
            solo: 'solo', couple: 'couple', family: 'family',
            friends: 'friends', senior: 'couple', business: 'solo',
          };
          const companionType = companionMap[trip.travelStyle];
          if (companionType) {
            observations.push({ dimension: 'companion_type', value: companionType, signedScore });
          }
        }
      } catch { /* non-critical */ }
    }
  }

  // ── Handle itinerary modifications ──────────────────────────────────────
  if (eventType === 'itinerary_modification') {
    // A user-selected replacement is weak positive evidence. A removal by
    // itself is not a permanent dislike; negative evidence requires a reason.
    observations.push(...extractModificationSignals(payload));
  }

  // ── Handle trip_reflection ────────────────────────────────────────────────
  if (eventType === 'trip_reflection') {
    const overallRating = payload.overallSatisfaction;
    if (!overallRating) return [];

    const overallSignedScore = computeSignedScore(overallRating);

    // Map dimension ratings to observations
    const dimMap = {
      heritage_value:  'site_category',
      food_quality:    'cuisine',
      crowd_comfort:   'crowd_level',
    };

    if (payload.dimensionRatings) {
      for (const [dimKey, rating] of Object.entries(payload.dimensionRatings)) {
        if (typeof rating !== 'number' || rating < 1 || rating > 5) continue;
        const signedScore = computeSignedScore(rating);
        // Map reflection dimension to PTKG dimension if applicable
        const ptkgDim = dimMap[dimKey];
        if (ptkgDim) {
          observations.push({ dimension: ptkgDim, value: dimKey, signedScore });
        }
      }
    }

    // Extract from discovered preferences
    for (const pref of (payload.preferencesDiscovered || [])) {
      // Map natural language preferences to dimension observations
      const prefMappings = {
        'Prefer morning visits': { dimension: 'time_of_day', value: 'morning', score: +0.8 },
        'Prefer smaller crowds': { dimension: 'crowd_level', value: 'low', score: +0.8 },
        'Enjoy slow travel':     { dimension: 'pace', value: 'relaxed', score: +0.8 },
        'Prefer quick overviews': { dimension: 'pace', value: 'packed', score: +0.6 },
        'Prefer budget stays':   { dimension: 'budget_range', value: 'budget', score: +0.8 },
        'Prefer eco stays':      { dimension: 'budget_range', value: 'mid', score: +0.6 },
      };
      const mapping = prefMappings[pref];
      if (mapping) {
        observations.push({ dimension: mapping.dimension, value: mapping.value, signedScore: mapping.score });
      }
    }
  }

  // ── Handle bookmark ───────────────────────────────────────────────────────
  if (eventType === 'bookmark') {
    // Bookmarking is a weak positive signal
    const signedScore = payload.action === 'add' ? 0.3 : -0.1;
    if (payload.siteId) {
      const site = await loadSiteAttributes(payload.siteId);
      if (site) {
        for (const style of (site.archStyle || [])) {
          observations.push({ dimension: 'arch_style', value: style, signedScore });
        }
        if (site.siteCategory) {
          observations.push({ dimension: 'site_category', value: site.siteCategory, signedScore });
        }
        if (site.region) {
          observations.push({ dimension: 'heritage_region', value: site.region, signedScore });
        }
      }
    }
  }

  // ── Persist observations to MongoDB ──────────────────────────────────────
  if (observations.length === 0) {
    console.log(`[extractor] No observations extracted from experience ${experienceId}`);
    await TravelExperience.findByIdAndUpdate(experienceId, { processed: true, processedAt: new Date(), observationIds: [] });
    return [];
  }

  const obsDocuments = observations.map(o => ({
    userId,
    experienceId,
    tripId: tripId || null,
    tripIndex,
    dimension: o.dimension,
    value: o.value,
    signedScore: o.signedScore,
    source: eventType === 'site_feedback' ? 'site_feedback'
          : eventType === 'trip_reflection' ? 'trip_reflection'
          : eventType === 'itinerary_modification' ? 'itinerary_modification'
          : 'implicit_behavior',
  }));

  const savedObs = await Observation.insertMany(obsDocuments);
  const obsIds = savedObs.map(o => o._id);

  // Mark experience as processed
  await TravelExperience.findByIdAndUpdate(experienceId, {
    processed: true,
    processedAt: new Date(),
    observationIds: obsIds,
  });

  console.log(`[extractor] Extracted ${savedObs.length} observations from experience ${experienceId}`);
  return savedObs;
}

/**
 * processUnprocessedExperiences(userId)
 *
 * Batch processes all unprocessed experiences for a user.
 * Called during consolidation to ensure all observations are up to date.
 */
async function processUnprocessedExperiences(userId) {
  const unprocessed = await TravelExperience.find({
    userId,
    processed: false,
  }).select('_id').lean();

  const results = [];
  for (const exp of unprocessed) {
    try {
      const obs = await extractObservationsFromExperience(exp._id);
      results.push({ experienceId: exp._id, observationCount: obs.length });
    } catch (err) {
      console.error(`[extractor] Failed to process experience ${exp._id}:`, err.message);
      results.push({ experienceId: exp._id, error: err.message });
    }
  }
  return results;
}

module.exports = {
  extractObservationsFromExperience,
  processUnprocessedExperiences,
  computeSignedScore,
  extractFeedbackSignals,
  extractModificationSignals,
};

