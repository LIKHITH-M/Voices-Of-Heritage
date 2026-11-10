/**
 * research-service/src/engine/graphRetrieval.js
 *
 * Graph Context Retrieval Engine for the Personal Travel Knowledge Graph (PTKG).
 *
 * Retrieves personalized heritage context for a user planning a trip:
 *   1. Destination-to-Region mapping
 *   2. Candidate heritage site retrieval (spatial & regional expansion)
 *   3. PTKG Preference filtering & confidence weighting
 *   4. Personalized scoring of candidate heritage sites
 *   5. Visited sites detection (to avoid redundant recommendations)
 *   6. Explainability match tracing for downstream prompt injection
 */

const HeritageSite = require('../models/heritageSite.model');
const PreferenceSnapshot = require('../models/preference.model');
const SavedTrip = require('../models/trip.model');
const { getVisitedSiteIds } = require('./ptkgManager');
const config = require('../config/default');

// ─── Region Maps ──────────────────────────────────────────────────────────────

const REGION_MAP = {
  hampi: 'Karnataka',
  gokarna: 'Karnataka',
  mysore: 'Karnataka',
  belur: 'Karnataka',
  halebidu: 'Karnataka',
  badami: 'Karnataka',
  pattadakal: 'Karnataka',
  aihole: 'Karnataka',
  bangalore: 'Karnataka',
  bengaluru: 'Karnataka',
  thanjavur: 'Tamil Nadu',
  madurai: 'Tamil Nadu',
  mahabalipuram: 'Tamil Nadu',
  mamallapuram: 'Tamil Nadu',
  chennai: 'Tamil Nadu',
  kanchipuram: 'Tamil Nadu',
  jaipur: 'Rajasthan',
  jodhpur: 'Rajasthan',
  jaisalmer: 'Rajasthan',
  udaipur: 'Rajasthan',
  pushkar: 'Rajasthan',
  kumbhalgarh: 'Rajasthan',
  agra: 'Uttar Pradesh',
  'fatehpur sikri': 'Uttar Pradesh',
  varanasi: 'Uttar Pradesh',
  lucknow: 'Uttar Pradesh',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  aurangabad: 'Maharashtra',
  ajanta: 'Maharashtra',
  ellora: 'Maharashtra',
  mumbai: 'Maharashtra',
  elephanta: 'Maharashtra',
  pune: 'Maharashtra',
  goa: 'Goa',
  patan: 'Gujarat',
  modhera: 'Gujarat',
  ahmedabad: 'Gujarat',
  konark: 'Odisha',
  puri: 'Odisha',
  bhubaneswar: 'Odisha',
  khajuraho: 'Madhya Pradesh',
  spiti: 'Himachal Pradesh',
  manali: 'Himachal Pradesh',
  bishnupur: 'West Bengal',
  kolkata: 'West Bengal',
  kochi: 'Kerala',
  thiruvananthapuram: 'Kerala',
  hyderabad: 'Telangana',
  golconda: 'Telangana',
};

const REGION_NEARBY = {
  Karnataka: ['Karnataka', 'Tamil Nadu', 'Kerala', 'Goa', 'Telangana'],
  'Tamil Nadu': ['Tamil Nadu', 'Karnataka', 'Kerala'],
  Rajasthan: ['Rajasthan', 'Gujarat', 'Delhi', 'Uttar Pradesh'],
  'Uttar Pradesh': ['Uttar Pradesh', 'Delhi', 'Rajasthan', 'Madhya Pradesh'],
  Delhi: ['Delhi', 'Uttar Pradesh', 'Rajasthan', 'Haryana'],
  Maharashtra: ['Maharashtra', 'Goa', 'Karnataka', 'Gujarat'],
  Gujarat: ['Gujarat', 'Rajasthan', 'Maharashtra'],
  Goa: ['Goa', 'Karnataka', 'Maharashtra'],
  Odisha: ['Odisha', 'West Bengal'],
  'Himachal Pradesh': ['Himachal Pradesh', 'Uttarakhand'],
  'West Bengal': ['West Bengal', 'Odisha'],
  Kerala: ['Kerala', 'Tamil Nadu', 'Karnataka'],
  'Madhya Pradesh': ['Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Maharashtra'],
  Telangana: ['Telangana', 'Karnataka', 'Maharashtra', 'Andhra Pradesh'],
};

const DESTINATION_CENTERS = [
  { aliases: ['hampi', 'vijayanagara', 'hospet', 'hosapete'], lat: 15.335, lng: 76.462, radiusKm: 80 },
  { aliases: ['mysore', 'mysuru', 'srirangapatna'], lat: 12.305, lng: 76.655, radiusKm: 65 },
  { aliases: ['belur', 'beluru', 'halebidu', 'halebeedu'], lat: 13.188, lng: 75.927, radiusKm: 45 },
  { aliases: ['badami', 'pattadakal', 'aihole'], lat: 15.88, lng: 75.77, radiusKm: 65 },
];

function haversineDistanceKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) ||
      !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return Infinity;
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function filterCandidatesToDestination(candidates, destination) {
  const query = String(destination || '').toLowerCase();
  const centers = DESTINATION_CENTERS.filter(center => center.aliases.some(alias => query.includes(alias)));
  if (!centers.length) return candidates;
  return candidates.filter(site => centers.some(center =>
    haversineDistanceKm(site.coordinates, center) <= center.radiusKm
  ));
}

function inferRegion(destination) {
  if (!destination) return null;
  const d = destination.toLowerCase().trim();
  for (const [key, reg] of Object.entries(REGION_MAP)) {
    if (d.includes(key)) return reg;
  }
  return null;
}

// ─── Main Retrieval Function ──────────────────────────────────────────────────

/**
 * retrieveContextForDestination(userId, options)
 *
 * @param {string} userId
 * @param {object} options - { destination, region, duration, interests, groupSize }
 * @returns {object} Context pack with ranked candidates and PTKG evidence
 */
async function retrieveContextForDestination(userId, options = {}) {
  const { destination = '', region = '', duration = 3, interests = [], groupSize = 1 } = options;

  const targetRegion = region || inferRegion(destination) || destination;
  const regionsToQuery = targetRegion && REGION_NEARBY[targetRegion]
    ? REGION_NEARBY[targetRegion]
    : targetRegion ? [targetRegion] : [];

  // 1. Query candidate heritage sites & PTKG snapshots safely (only if MongoDB connected)
  let candidates = [];
  let prefs = [];
  let visitedSiteIds = [];
  let totalTrips = 0;

  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    try {
      const siteQuery = { isActive: true };
      if (regionsToQuery.length > 0) {
        siteQuery.region = { $in: regionsToQuery };
      }
      candidates = await HeritageSite.find(siteQuery)
        .limit(config.CONTEXT_MAX_CANDIDATES * 2)
        .lean();
      candidates = filterCandidatesToDestination(candidates || [], destination);

      const [p, v, t] = await Promise.all([
        PreferenceSnapshot.find({
          userId,
          status: { $in: ['like', 'avoid'] },
        }).sort({ confidence: -1 }).lean(),
        getVisitedSiteIds(userId).catch(() => []),
        SavedTrip.countDocuments({ userId }),
      ]);
      prefs = p || [];
      visitedSiteIds = v || [];
      totalTrips = t || 0;
    } catch (dbErr) {
      console.warn('[graphRetrieval] MongoDB query unavailable, using resilient fallback:', dbErr.message);
    }
  }

  // Resilient candidate sites fallback from authoritative heritageKnowledge
  if (!candidates || candidates.length === 0) {
    try {
      const { parseDestinationScope } = require('../../../ai-planner-service/src/services/heritageKnowledge');
      const matchingHubs = parseDestinationScope(destination);
      candidates = matchingHubs.flatMap(hub => (hub.subSites || []).map(s => ({
        siteId: s.siteId,
        name: s.name,
        region: hub.region,
        district: hub.district,
        archStyle: hub.archStyle,
        period: [hub.dynasty],
        dynasty: [hub.dynasty],
        siteCategory: s.category,
        knownFor: [s.preferenceMatchTag || s.name],
        unescoStatus: hub.name.includes('UNESCO') ? 'world_heritage' : 'none',
        entryFeeINR: s.entryFeeINR || 0,
        avgVisitDurationHours: s.duration || 2,
        commonActivities: [s.name],
        localCuisine: hub.cuisines || [],
        coordinates: s.coordinates || hub.coordinates,
        rating: 4.8,
      })));
    } catch (e) {
      console.warn('[graphRetrieval] Hub fallback failed:', e.message);
    }
  }

  const likedPrefs = prefs
    .filter(p => p.status === 'like')
    .slice(0, config.CONTEXT_TOP_K_PREFS);

  const avoidedPrefs = prefs
    .filter(p => p.status === 'avoid')
    .slice(0, config.CONTEXT_TOP_K_AVOIDED);

  const isColdStart = (likedPrefs.length === 0 && avoidedPrefs.length === 0);

  // 3. Score candidate sites against PTKG preferences
  const rankedCandidates = candidates.map(site => {
    let score = (site.rating || 4.0) / 5.0; // base score 0.8
    const matchedPreferences = [];
    const penaltyReasons = [];

    const siteAttributes = [
      ...(site.archStyle || []),
      ...(site.dynasty || []),
      ...(site.siteCategory ? [site.siteCategory] : []),
      ...(site.commonActivities || []),
      ...(site.localCuisine || []),
      ...(site.knownFor || []),
    ].map(s => s.toLowerCase());

    // Liked preferences boost
    for (const p of likedPrefs) {
      const pVal = p.value.toLowerCase();
      const isMatch = siteAttributes.some(attr => attr.includes(pVal) || pVal.includes(attr));
      if (isMatch) {
        const boost = (p.affinity * p.confidence) * 0.5;
        score += boost;
        matchedPreferences.push({
          dimension: p.dimension,
          value: p.value,
          affinity: p.affinity,
          confidence: p.confidence,
          boost: Math.round(boost * 100) / 100,
        });
      }
    }

    // Avoided preferences penalty
    for (const p of avoidedPrefs) {
      const pVal = p.value.toLowerCase();
      const isMatch = siteAttributes.some(attr => attr.includes(pVal) || pVal.includes(attr));
      if (isMatch) {
        const penalty = (Math.abs(p.affinity) * p.confidence) * 0.8;
        score -= penalty;
        penaltyReasons.push({
          dimension: p.dimension,
          value: p.value,
          penalty: Math.round(penalty * 100) / 100,
        });
      }
    }

    // Requested interests match boost
    for (const interest of interests) {
      const intVal = String(interest).toLowerCase();
      const isMatch = siteAttributes.some(attr => attr.includes(intVal) || intVal.includes(attr));
      if (isMatch) {
        score += 0.25;
      }
    }

    // Visited site penalty / indicator
    const isVisited = visitedSiteIds.includes(site.siteId);
    if (isVisited) {
      score -= 0.15; // slightly downweight already visited sites to promote novelty
    }

    return {
      siteId: site.siteId,
      name: site.name,
      subtitle: site.subtitle,
      region: site.region,
      state: site.state,
      district: site.district,
      archStyle: site.archStyle,
      dynasty: site.dynasty,
      siteCategory: site.siteCategory,
      coordinates: site.coordinates,
      avgVisitDurationHours: site.avgVisitDurationHours,
      entryFeeINR: site.entryFeeINR,
      commonActivities: site.commonActivities,
      localCuisine: site.localCuisine,
      timings: site.timings,
      rating: site.rating,
      personalizationScore: Math.round(score * 100) / 100,
      matchedPreferences,
      penaltyReasons,
      isVisited,
    };
  });

  // Sort candidates by personalization score descending
  rankedCandidates.sort((a, b) => b.personalizationScore - a.personalizationScore);

  const topCandidates = rankedCandidates.slice(0, config.CONTEXT_MAX_CANDIDATES);

  return {
    metadata: {
      userId,
      destination,
      targetRegion,
      duration,
      groupSize,
      isColdStart,
      totalTrips,
      retrievedAt: new Date().toISOString(),
    },
    likedPreferences: likedPrefs.map(p => ({
      dimension: p.dimension,
      value: p.value,
      affinity: Math.round(p.affinity * 100) / 100,
      confidence: Math.round(p.confidence * 100) / 100,
      status: p.status,
      driftFlag: p.driftFlag,
    })),
    avoidedPreferences: avoidedPrefs.map(p => ({
      dimension: p.dimension,
      value: p.value,
      affinity: Math.round(p.affinity * 100) / 100,
      confidence: Math.round(p.confidence * 100) / 100,
      status: p.status,
    })),
    visitedSiteIds,
    candidateSites: topCandidates,
  };
}

module.exports = {
  retrieveContextForDestination,
  inferRegion,
  REGION_MAP,
  REGION_NEARBY,
  filterCandidatesToDestination,
};

