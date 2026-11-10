/**
 * research-service/src/engine/inferenceEngine.js
 *
 * Preference Inference Engine — ported and extended from:
 *   ai-planner-service/src/depkg/engine/inferenceEngine.js
 *
 * This version operates on Observation documents (from MongoDB) rather than
 * DEPKGEpisode documents. The mathematical core is identical, but the input
 * format is the structured Observation schema from observation.model.js.
 *
 * Key formulas:
 *   signedScore(r)        = (r - 3) / 2                      → [-1, +1]
 *   weight(i, tNow, H)    = 0.5^((tNow - i) / H)            → exponential decay
 *   affinity              = (Σ w·s⁺ - Σ w·s⁻) / (Σw + κ)   → kappa-smoothed
 *   confidence            = |affinity| × min(1, nEff / nMin)
 *   status                = 'like' | 'avoid' | 'weak' | 'retired'
 */

const config = require('../config/default');

// ─── Core math functions ──────────────────────────────────────────────────────

function computeSignedScore(rating) {
  return (rating - config.SAT_MIDPOINT) / config.SAT_SCALE;
}

function computeWeight(tripIndex, tNow, H = config.HALF_LIFE_TRIPS) {
  if (!isFinite(H) || H <= 0) return 1.0;
  return Math.pow(0.5, (tNow - tripIndex) / H);
}

function crowdLabel(n) {
  return n <= 2 ? 'low' : n === 3 ? 'mid' : 'high';
}

// ─── Affinity + Confidence computation ───────────────────────────────────────

/**
 * computeAffinityAndConfidence(observations, tNow, opts)
 *
 * observations: Array of { signedScore, tripIndex, ... } (from Observation model)
 * tNow: current max tripIndex (most recent trip number)
 * opts: optional overrides for config constants
 *
 * Returns: { affinity, confidence, status, positiveSum, negativeSum, effectiveN, weightedObservations }
 */
function computeAffinityAndConfidence(observations, tNow, opts = {}) {
  const kappa   = opts.kappa    ?? config.KAPPA;
  const tau     = opts.tau      ?? config.AFFINITY_THRESHOLD;
  const cMin    = opts.cMin     ?? config.CONFIDENCE_MIN;
  const epsilon = opts.epsilon  ?? config.EVIDENCE_EPSILON;
  const nMin    = opts.nMin     ?? config.N_MIN;
  const H       = opts.halfLife ?? config.HALF_LIFE_TRIPS;

  let sPlus = 0, sMinus = 0, nEff = 0;

  const wObs = observations.map(o => ({
    ...o,
    weight: computeWeight(o.tripIndex, tNow, H),
  }));

  wObs.forEach(({ signedScore: s, weight: w }) => {
    sPlus  += w * Math.max(s, 0);
    sMinus += w * Math.max(-s, 0);
    nEff   += w;
  });

  if (nEff < epsilon) {
    return { affinity: 0, confidence: 0, status: 'retired', positiveSum: sPlus, negativeSum: sMinus, effectiveN: nEff, weightedObservations: wObs };
  }

  const affinity   = (sPlus - sMinus) / (nEff + kappa);
  const confidence = Math.abs(affinity) * Math.min(1, nEff / nMin);
  const status = affinity >= tau  && confidence >= cMin ? 'like'
               : affinity <= -tau && confidence >= cMin ? 'avoid'
               : 'weak';

  return { affinity, confidence, status, positiveSum: sPlus, negativeSum: sMinus, effectiveN: nEff, weightedObservations: wObs };
}

// ─── Drift detection ──────────────────────────────────────────────────────────

/**
 * detectDrift(observations, tNow, opts)
 *
 * Detects whether a preference has significantly changed recently
 * by comparing the recent window (last DRIFT_RECENT_WINDOW trips)
 * against older observations.
 */
function detectDrift(observations, tNow, opts = {}) {
  const R     = opts.driftRecentWindow ?? config.DRIFT_RECENT_WINDOW;
  const dMin  = opts.driftMinN         ?? config.DRIFT_MIN_N;
  const delta = opts.driftMinDelta     ?? config.DRIFT_MIN_DELTA;
  const H     = opts.halfLife          ?? config.HALF_LIFE_TRIPS;
  const kappa = opts.kappa             ?? config.KAPPA;

  const recent = observations.filter(o => o.tripIndex >= tNow - R + 1);
  const older  = observations.filter(o => o.tripIndex <  tNow - R + 1);

  const weightedAffinity = set => {
    if (!set.length) return null;
    let s = 0, m = 0, n = 0;
    set.forEach(o => {
      const w = computeWeight(o.tripIndex, tNow, H);
      s += w * Math.max(o.signedScore, 0);
      m += w * Math.max(-o.signedScore, 0);
      n += w;
    });
    return n < dMin ? null : (s - m) / (n + kappa);
  };

  const rA = weightedAffinity(recent);
  const oA = weightedAffinity(older);

  if (rA === null || oA === null) {
    return { driftFlag: false, recentAffinity: rA, olderAffinity: oA };
  }

  return {
    driftFlag: Math.sign(rA) !== Math.sign(oA) || Math.abs(rA - oA) >= delta,
    recentAffinity: rA,
    olderAffinity: oA,
  };
}

// ─── Grouping helpers ─────────────────────────────────────────────────────────

function groupObservationsByKey(all) {
  const g = new Map();
  all.forEach(o => {
    const k = `${o.dimension}::${o.value}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(o);
  });
  return g;
}

function parseGroupKey(k) {
  const i = k.indexOf('::');
  return { dimension: k.substring(0, i), value: k.substring(i + 2) };
}

// ─── Main preference computation pipeline ────────────────────────────────────

/**
 * computePreferenceUpdates(observations, opts)
 *
 * Takes an array of Observation documents (from MongoDB),
 * groups them by (dimension, value), and computes affinity+confidence
 * for each group.
 *
 * This is the PTKG version — operates on Observation docs, not DEPKGEpisodes.
 *
 * Returns: Array of preference update objects, one per (dimension, value) pair.
 */
function computePreferenceUpdates(observations, opts = {}) {
  if (!observations || !observations.length) return [];

  const tNow = Math.max(...observations.map(o => o.tripIndex));
  const groups = groupObservationsByKey(observations);
  const updates = [];

  for (const [key, obs] of groups) {
    const { dimension, value } = parseGroupKey(key);
    const m = computeAffinityAndConfidence(obs, tNow, opts);
    const d = detectDrift(obs, tNow, opts);

    // Classify supporting vs contradicting observations
    const sIds = [], cIds = [];
    (m.weightedObservations || []).forEach(w => {
      const id = w._id?.toString() || w.id;
      if (!id) return;
      const isSupporting = (w.signedScore >= 0 && m.affinity >= 0) || (w.signedScore < 0 && m.affinity < 0);
      if (isSupporting) { if (!sIds.includes(id)) sIds.push(id); }
      else              { if (!cIds.includes(id)) cIds.push(id); }
    });

    updates.push({
      dimension,
      value,
      affinity:               m.affinity,
      confidence:             m.confidence,
      status:                 m.status,
      positiveWeightedSum:    m.positiveSum,
      negativeWeightedSum:    m.negativeSum,
      effectiveN:             m.effectiveN,
      driftFlag:              d.driftFlag,
      recentAffinity:         d.recentAffinity,
      olderAffinity:          d.olderAffinity,
      supportingObsIds:       sIds,
      contradictingObsIds:    cIds,
      mostRecentTripIndex:    Math.max(...obs.map(o => o.tripIndex)),
      observationCount:       obs.length,
    });
  }

  return updates;
}

module.exports = {
  computeSignedScore,
  crowdLabel,
  computeWeight,
  computeAffinityAndConfidence,
  detectDrift,
  groupObservationsByKey,
  parseGroupKey,
  computePreferenceUpdates,
};

