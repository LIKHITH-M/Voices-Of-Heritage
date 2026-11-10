/**
 * research-service/src/config/default.js
 *
 * Configuration constants for the PTKG research system.
 * Mirrors the tuning constants from ai-planner-service/src/depkg/config/default.js
 * but extended for the full research pipeline.
 */

module.exports = {
  // ─── Preference Inference (same as DEPKG, tunable for research) ─────────────
  HALF_LIFE_TRIPS: 4,            // Exponential decay half-life in trips
  KAPPA: 0.5,                    // Affinity smoothing constant (prevents cold-start overfitting)
  AFFINITY_THRESHOLD: 0.25,      // Min affinity to classify as 'like' or 'avoid'
  CONFIDENCE_MIN: 0.3,           // Min confidence threshold for meaningful preference
  EVIDENCE_EPSILON: 0.01,        // Minimum effective N before retiring preference
  N_MIN: 3,                      // Minimum observations for full confidence score
  SAT_MIDPOINT: 3,               // Satisfaction midpoint (neutral = 3 on 1-5 scale)
  SAT_SCALE: 2,                  // Satisfaction scaling divisor → signed score in [-1, +1]

  // ─── Drift Detection ─────────────────────────────────────────────────────────
  DRIFT_RECENT_WINDOW: 3,        // Number of recent trips to compare against older
  DRIFT_MIN_N: 2,                // Minimum observations needed in each window for drift check
  DRIFT_MIN_DELTA: 0.4,          // Minimum affinity delta to flag as preference drift

  // ─── Consolidation ───────────────────────────────────────────────────────────
  CONSOLIDATION_TRIGGER_X: 1,    // Number of new trips before auto-consolidation runs

  // ─── Graph Retrieval ─────────────────────────────────────────────────────────
  CONTEXT_TOP_K_PREFS: 10,       // Max liked preferences included in LLM context
  CONTEXT_TOP_K_AVOIDED: 5,      // Max avoided preferences included in LLM context
  CONTEXT_MAX_CANDIDATES: 20,    // Max heritage site candidates returned
  CONTEXT_SUPPORTING_EPISODES: 3, // Max supporting episodes per preference in context

  // ─── Graph Compression ───────────────────────────────────────────────────────
  MAX_CONTEXT_TOKENS: 1500,      // Approximate token budget for PTKG context in prompt
  PREFERENCE_MIN_CONFIDENCE: 0.2, // Min confidence to include preference in compressed context

  // ─── RAG ─────────────────────────────────────────────────────────────────────
  RAG_TOP_K_CHUNKS: 5,           // Number of RAG chunks to retrieve per query
  RAG_MIN_SCORE: 0.6,            // Minimum similarity score for RAG chunk inclusion

  // ─── Observation Extraction ───────────────────────────────────────────────────
  // The 13 dimensions of the PTKG
  DIMENSIONS: [
    'arch_style',       // Dravidian, Nagara, Vesara, Indo-Islamic, etc.
    'period',           // Ancient, Medieval, Colonial, Modern
    'dynasty',          // Hoysala, Vijayanagara, Chalukya, Mughal, Chola, etc.
    'site_category',    // Temple, Fort, Palace, Ruins, Caves, Museum, etc.
    'heritage_region',  // Karnataka, Rajasthan, Tamil Nadu, etc.
    'cuisine',          // South Indian, Mughlai, Rajasthani, Street Food, etc.
    'time_of_day',      // morning, afternoon, evening, night
    'crowd_level',      // low, mid, high
    'transport_mode',   // car, train, bus, flight, walking, bike
    'activity',         // Photography, Guided Tour, Trekking, Meditation, etc.
    'budget_range',     // budget, mid, comfort, luxury
    'pace',             // relaxed, balanced, packed
    'companion_type',   // solo, couple, family, friends, group
  ],

  // ─── Evaluation ──────────────────────────────────────────────────────────────
  RESEARCH_MODES: {
    BASELINE: 'baseline',   // Mode A: existing AI Trip Planner (no PTKG)
    RESEARCH: 'research',   // Mode B: PTKG-enhanced itinerary generation
  },
};

