/**
 * research-service/src/engine/ptkgManager.js
 *
 * Personal Travel Knowledge Graph Manager.
 *
 * Responsible for:
 *   1. Building/rebuilding the user's PTKG from source data
 *      (PreferenceSnapshots, SavedTrips, TravelExperiences)
 *   2. Incremental node/edge upserts after consolidation
 *   3. Graph queries for context retrieval (Phase 10)
 *   4. Providing graph data for visualization (Phase 18)
 *
 * Node types: traveler, trip, site, arch_style, dynasty, cuisine, activity, preference, region
 * Edge types: TOOK, VISITED, HAS_PREFERENCE, HAS_STYLE, BUILT_BY, NEAR, AT_SITE, etc.
 *
 * Uses MongoDB $graphLookup for multi-hop traversal.
 */

const { PTKGNode, PTKGEdge } = require('../models/ptkg.model');
const PreferenceSnapshot = require('../models/preference.model');
const SavedTrip = require('../models/trip.model');
const TravelExperience = require('../models/experience.model');

// ─── Node ID helpers ──────────────────────────────────────────────────────────

const nodeId = {
  traveler:   (userId)              => `traveler::${userId}`,
  trip:       (tripId)              => `trip::${tripId}`,
  site:       (siteId)              => `site::${siteId}`,
  archStyle:  (style)               => `arch_style::${style}`,
  dynasty:    (dynasty)             => `dynasty::${dynasty}`,
  cuisine:    (cuisine)             => `cuisine::${cuisine}`,
  activity:   (activity)            => `activity::${activity}`,
  preference: (dimension, value)    => `pref::${dimension}::${value}`,
  region:     (region)              => `region::${region}`,
};

const edgeId = (userId, relType, fromId, toId) =>
  `${relType}::${fromId}::${toId}`;

// ─── Upsert helpers ───────────────────────────────────────────────────────────

async function upsertNode(userId, nId, nodeType, label, emoji, properties) {
  return PTKGNode.findOneAndUpdate(
    { userId, nodeId: nId },
    { $set: { nodeType, label, emoji, properties, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

async function upsertEdge(userId, relType, fromNodeId, toNodeId, weight = 1.0, properties = {}) {
  const eId = edgeId(userId, relType, fromNodeId, toNodeId);
  return PTKGEdge.findOneAndUpdate(
    { userId, edgeId: eId },
    { $set: { relType, fromNodeId, toNodeId, weight, properties, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

// ─── Build PTKG for a user ────────────────────────────────────────────────────

/**
 * buildPTKG(userId)
 *
 * Full PTKG rebuild from source data.
 * Called after consolidation to reflect latest preferences + trips.
 *
 * Returns: { nodesUpserted, edgesUpserted }
 */
async function buildPTKG(userId) {
  let nodesUpserted = 0;
  let edgesUpserted = 0;

  // ── 1. Traveler node ───────────────────────────────────────────────────────
  const tripCount = await SavedTrip.countDocuments({ userId });
  const travelerNId = nodeId.traveler(userId);
  await upsertNode(userId, travelerNId, 'traveler', 'You (Traveler)', '🧳', {
    totalTrips: tripCount,
    memberSince: new Date().toISOString(),
  });
  nodesUpserted++;

  // ── 2. Preference nodes + edges ───────────────────────────────────────────
  const prefs = await PreferenceSnapshot.find({ userId, status: { $in: ['like', 'avoid'] } }).lean();

  for (const pref of prefs) {
    const prefNId = nodeId.preference(pref.dimension, pref.value);
    await upsertNode(userId, prefNId, 'preference', `${pref.value} (${pref.dimension})`,
      pref.status === 'like' ? '❤️' : '👎',
      {
        dimension:  pref.dimension,
        value:      pref.value,
        affinity:   pref.affinity,
        confidence: pref.confidence,
        status:     pref.status,
        driftFlag:  pref.driftFlag,
      }
    );
    nodesUpserted++;

    // HAS_PREFERENCE edge: Traveler → Preference
    await upsertEdge(userId, 'HAS_PREFERENCE', travelerNId, prefNId,
      Math.abs(pref.affinity), // weight = absolute affinity
      { affinity: pref.affinity, confidence: pref.confidence, status: pref.status }
    );
    edgesUpserted++;
  }

  // ── 3. Trip nodes + TOOK edges ────────────────────────────────────────────
  const trips = await SavedTrip.find({ userId }).select('tripId destination totalDays status overallSatisfaction tripIndex createdAt').lean();

  for (const trip of trips) {
    const tripNId = nodeId.trip(trip.tripId);
    await upsertNode(userId, tripNId, 'trip', trip.destination,
      '✈️',
      {
        destination:          trip.destination,
        totalDays:            trip.totalDays,
        status:               trip.status,
        overallSatisfaction:  trip.overallSatisfaction,
        tripIndex:            trip.tripIndex,
        date:                 trip.createdAt,
      }
    );
    nodesUpserted++;

    // TOOK edge: Traveler → Trip
    await upsertEdge(userId, 'TOOK', travelerNId, tripNId,
      trip.overallSatisfaction ? trip.overallSatisfaction / 5 : 0.5,
      { tripIndex: trip.tripIndex, overallSatisfaction: trip.overallSatisfaction }
    );
    edgesUpserted++;
  }

  // ── 4. Site nodes from experiences ────────────────────────────────────────
  const feedbacks = await TravelExperience.find({
    userId, eventType: 'site_feedback',
  }).select('payload tripId').lean();

  for (const fb of feedbacks) {
    const { siteId, siteName, satisfactionRating } = fb.payload || {};
    if (!siteId || !siteName) continue;

    const siteNId = nodeId.site(siteId);
    await upsertNode(userId, siteNId, 'site', siteName, '🏛️', {
      siteId,
      userRating: satisfactionRating,
    });
    nodesUpserted++;

    // VISITED edge: Trip → Site (if tripId available)
    if (fb.tripId) {
      const tripNId = nodeId.trip(fb.tripId);
      await upsertEdge(userId, 'VISITED', tripNId, siteNId,
        satisfactionRating ? satisfactionRating / 5 : 0.5,
        { satisfaction: satisfactionRating }
      );
      edgesUpserted++;
    }
  }

  console.log(`[ptkg] Built PTKG for ${userId}: ${nodesUpserted} nodes, ${edgesUpserted} edges`);
  return { nodesUpserted, edgesUpserted };
}

// ─── Graph queries ────────────────────────────────────────────────────────────

/**
 * getPTKGSummary(userId)
 * Returns high-level stats about the user's PTKG.
 */
async function getPTKGSummary(userId) {
  const [nodeCount, edgeCount, prefCount, tripCount] = await Promise.all([
    PTKGNode.countDocuments({ userId }),
    PTKGEdge.countDocuments({ userId }),
    PTKGNode.countDocuments({ userId, nodeType: 'preference' }),
    PTKGNode.countDocuments({ userId, nodeType: 'trip' }),
  ]);

  const topLiked = await PTKGNode.find({ userId, nodeType: 'preference', 'properties.status': 'like' })
    .sort({ 'properties.affinity': -1 })
    .limit(5)
    .select('label properties.affinity properties.dimension')
    .lean();

  const topAvoided = await PTKGNode.find({ userId, nodeType: 'preference', 'properties.status': 'avoid' })
    .sort({ 'properties.affinity': 1 })
    .limit(3)
    .select('label properties.affinity properties.dimension')
    .lean();

  return {
    nodeCount, edgeCount, prefCount, tripCount,
    topLiked:   topLiked.map(n => ({ label: n.label, affinity: n.properties?.affinity, dimension: n.properties?.dimension })),
    topAvoided: topAvoided.map(n => ({ label: n.label, affinity: n.properties?.affinity, dimension: n.properties?.dimension })),
  };
}

/**
 * getPTKGForVisualization(userId, depth)
 * Returns all nodes and edges for the user's PTKG (for DEPKGGraph3D replacement).
 */
async function getPTKGForVisualization(userId) {
  const [nodes, edges] = await Promise.all([
    PTKGNode.find({ userId }).lean(),
    PTKGEdge.find({ userId }).lean(),
  ]);
  return { nodes, edges };
}

/**
 * getPreferenceNodes(userId, status, limit)
 * Returns preference nodes filtered by status.
 */
async function getPreferenceNodes(userId, status = 'like', limit = 15) {
  return PTKGNode.find({ userId, nodeType: 'preference', 'properties.status': status })
    .sort({ 'properties.affinity': status === 'like' ? -1 : 1 })
    .limit(limit)
    .lean();
}

/**
 * getVisitedSiteIds(userId)
 * Returns list of siteIds the user has visited (from PTKG VISITED edges).
 */
async function getVisitedSiteIds(userId) {
  const edges = await PTKGEdge.find({ userId, relType: 'VISITED' })
    .select('toNodeId')
    .lean();
  return edges.map(e => e.toNodeId.replace('site::', ''));
}

module.exports = {
  buildPTKG,
  getPTKGSummary,
  getPTKGForVisualization,
  getPreferenceNodes,
  getVisitedSiteIds,
  upsertNode,
  upsertEdge,
  nodeId,
};

