/**
 * research-service/src/models/ptkg.model.js
 *
 * MongoDB schema for Personal Travel Knowledge Graph (PTKG) nodes and edges.
 *
 * We use MongoDB with $graphLookup for graph traversal instead of Neo4j,
 * since we already have MongoDB in the stack. If graph queries become a
 * bottleneck in Phase 11+, Neo4j can be added as an optional layer.
 *
 * Graph structure:
 *   Nodes: Traveler, Trip, HeritageSite, ArchStyle, Dynasty, Cuisine, Activity, Preference
 *   Edges: TOOK, VISITED, HAS_PREFERENCE, BUILT_BY, HAS_STYLE, NEAR, etc.
 *
 * The PTKG is DERIVED from:
 *   - SavedTrip documents (nodes: Trip)
 *   - TravelExperience documents (nodes: Visit edges)
 *   - PreferenceSnapshot documents (nodes: Preference)
 *   - HeritageSite collection (nodes: Site, ArchStyle, Dynasty, Cuisine)
 *
 * It is rebuilt/updated during consolidation runs.
 */

const mongoose = require('mongoose');

// ─── PTKG Node Schema ─────────────────────────────────────────────────────────

const PTKGNodeSchema = new mongoose.Schema({
  // Node identity
  userId: { type: String, required: true, index: true },
  nodeId: { type: String, required: true },        // Unique within user graph (e.g. "site::hampi", "pref::arch_style::Dravidian")
  nodeType: {
    type: String,
    required: true,
    enum: ['traveler', 'trip', 'site', 'arch_style', 'dynasty', 'cuisine', 'activity', 'preference', 'region'],
    index: true,
  },

  // Display properties
  label: { type: String, required: true },         // Human-readable label
  emoji: String,                                   // Display emoji for visualization

  // Type-specific properties (flexible JSONB-style)
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Examples:
  //   traveler:   { totalTrips, memberSince }
  //   trip:       { destination, startDate, endDate, totalDays, overallSatisfaction }
  //   site:       { siteId, region, unescoStatus, coordinates }
  //   preference: { affinity, confidence, status, dimension, value, driftFlag }
  //   arch_style: { period, description }

  // Graph metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'ptkg_nodes',
});

PTKGNodeSchema.index({ userId: 1, nodeId: 1 }, { unique: true });
PTKGNodeSchema.index({ userId: 1, nodeType: 1 });

// ─── PTKG Edge Schema ─────────────────────────────────────────────────────────

const PTKGEdgeSchema = new mongoose.Schema({
  // Edge identity
  userId: { type: String, required: true, index: true },
  edgeId: { type: String, required: true },        // Unique within user graph

  // Relationship
  relType: {
    type: String,
    required: true,
    enum: [
      'TOOK',               // Traveler → Trip
      'HAS_PREFERENCE',     // Traveler → Preference
      'VISITED',            // Trip → Site
      'AT_SITE',            // Experience → Site
      'DID_ACTIVITY',       // Experience → Activity
      'TASTED',             // Experience → Cuisine
      'HAS_STYLE',          // Site → ArchStyle
      'BUILT_BY',           // Site → Dynasty
      'OFFERS',             // Site → Cuisine
      'NEAR',               // Site → Site (spatial)
      'SUPPORTED_BY',       // Preference → Experience
      'CONTRADICTED_BY',    // Preference → Experience
    ],
    index: true,
  },

  // Endpoints
  fromNodeId: { type: String, required: true },
  toNodeId:   { type: String, required: true },

  // Edge properties
  weight: { type: Number, default: 1.0 },          // Strength of relationship
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Examples:
  //   VISITED:        { dayNumber, duration, satisfaction, visitDate }
  //   NEAR:           { distanceKm, travelTimeMin }
  //   HAS_PREFERENCE: { affinity, confidence, updatedAt }
  //   TOOK:           { tripIndex, overallSatisfaction }

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'ptkg_edges',
});

PTKGEdgeSchema.index({ userId: 1, edgeId: 1 }, { unique: true });
PTKGEdgeSchema.index({ userId: 1, fromNodeId: 1, relType: 1 });
PTKGEdgeSchema.index({ userId: 1, toNodeId: 1, relType: 1 });
PTKGEdgeSchema.index({ userId: 1, relType: 1 });

const PTKGNode = mongoose.model('PTKGNode', PTKGNodeSchema);
const PTKGEdge = mongoose.model('PTKGEdge', PTKGEdgeSchema);

module.exports = { PTKGNode, PTKGEdge };

