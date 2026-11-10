/**
 * research-service/src/engine/consolidationEngine.js
 *
 * Consolidation Engine — runs preference inference on accumulated observations
 * and upserts PreferenceSnapshot documents.
 *
 * Ported and extended from:
 *   ai-planner-service/src/depkg/engine/consolidationEngine.js
 *
 * Key differences from the DEPKG version:
 *   - Operates on Observation documents (not DEPKGEpisodes)
 *   - Uses the research-service's PreferenceSnapshot model
 *   - Tracks consolidation state on the SavedTrip model
 *
 * Trigger: Called after each POST /api/research/feedback or /reflection
 *          when unconsolidated trips >= CONSOLIDATION_TRIGGER_X (default: 1)
 *
 * Flow:
 *   1. Find unprocessed TravelExperiences and extract observations
 *   2. Load all Observation documents for this user
 *   3. Run computePreferenceUpdates()
 *   4. Upsert PreferenceSnapshot documents
 *   5. Mark trips as consolidated
 */

const { v4: uuidv4 } = require('uuid');
const Observation = require('../models/observation.model');
const PreferenceSnapshot = require('../models/preference.model');
const SavedTrip = require('../models/trip.model');
const { processUnprocessedExperiences } = require('./observationExtractor');
const { computePreferenceUpdates } = require('./inferenceEngine');
const { buildPTKG } = require('./ptkgManager');
const config = require('../config/default');

// ─── Main consolidation function ──────────────────────────────────────────────

/**
 * runConsolidation(userId)
 *
 * Full consolidation cycle for a single user:
 *   1. Extract observations from any unprocessed experiences
 *   2. Load all observations
 *   3. Compute preference updates
 *   4. Upsert PreferenceSnapshot documents
 *   5. Mark unconsolidated trips as consolidated
 *
 * Returns: { runId, userId, preferencesCreated, preferencesUpdated, preferencesRetired, driftFlagged, observationsProcessed }
 */
async function runConsolidation(userId) {
  const runId = uuidv4();
  const startTime = Date.now();
  console.log(`[consolidation] Starting run ${runId} for user ${userId}`);

  // Step 1: Extract observations from any unprocessed experiences
  await processUnprocessedExperiences(userId);

  // Step 2: Load ALL observations for this user
  const observations = await Observation.find({ userId }).lean();
  if (!observations.length) {
    console.log(`[consolidation] No observations for user ${userId} — skipping`);
    return { runId, userId, preferencesCreated: 0, preferencesUpdated: 0, preferencesRetired: 0, driftFlagged: 0, observationsProcessed: 0 };
  }

  // Step 3: Compute preference updates
  const updates = computePreferenceUpdates(observations);

  // Step 4: Upsert PreferenceSnapshot documents
  let created = 0, updated = 0, retired = 0, driftFlagged = 0;

  for (const u of updates) {
    const filter = { userId, dimension: u.dimension, value: u.value };
    const update = {
      $set: {
        affinity:              u.affinity,
        confidence:            u.confidence,
        status:                u.status,
        positiveWeightedSum:   u.positiveWeightedSum,
        negativeWeightedSum:   u.negativeWeightedSum,
        effectiveN:            u.effectiveN,
        observationCount:      u.observationCount,
        driftFlag:             u.driftFlag,
        recentAffinity:        u.recentAffinity,
        olderAffinity:         u.olderAffinity,
        supportingObsIds:      u.supportingObsIds,
        contradictingObsIds:   u.contradictingObsIds,
        mostRecentTripIndex:   u.mostRecentTripIndex,
        lastConsolidationRunId: runId,
        lastConsolidatedAt:    new Date(),
      },
    };

    const result = await PreferenceSnapshot.findOneAndUpdate(filter, update, {
      upsert: true,
      new: false, // return old doc to detect create vs update
    });

    if (!result) created++;
    else updated++;
    if (u.status === 'retired') retired++;
    if (u.driftFlag) driftFlagged++;
  }

  // Step 5: Mark unconsolidated trips as consolidated
  await SavedTrip.updateMany(
    { userId, isConsolidated: false },
    { $set: { isConsolidated: true, consolidatedAt: new Date() } }
  );

  // Step 6: Synchronize PTKG graph nodes & edges
  let ptkgStats = null;
  try {
    ptkgStats = await buildPTKG(userId);
  } catch (ptkgErr) {
    console.error(`[consolidation] PTKG build error for ${userId}:`, ptkgErr.message);
  }

  const durationMs = Date.now() - startTime;
  console.log(`[consolidation] Run ${runId} complete in ${durationMs}ms: created=${created} updated=${updated} retired=${retired} driftFlagged=${driftFlagged}`);

  return {
    runId,
    userId,
    preferencesCreated: created,
    preferencesUpdated: updated,
    preferencesRetired: retired,
    driftFlagged,
    observationsProcessed: observations.length,
    ptkgStats,
    durationMs,
  };
}

/**
 * maybeRunConsolidation(userId)
 *
 * Auto-triggers consolidation when the number of unconsolidated trips
 * reaches CONSOLIDATION_TRIGGER_X (default: 1 — trigger after every trip).
 *
 * This is called non-blockingly after each feedback/reflection event.
 */
async function maybeRunConsolidation(userId) {
  try {
    const unconsolidatedCount = await SavedTrip.countDocuments({
      userId,
      isConsolidated: false,
    });

    if (unconsolidatedCount >= config.CONSOLIDATION_TRIGGER_X) {
      console.log(`[consolidation] Auto-triggering for user ${userId} (${unconsolidatedCount} unconsolidated trips)`);
      return await runConsolidation(userId);
    } else {
      console.log(`[consolidation] No trigger for user ${userId} (${unconsolidatedCount}/${config.CONSOLIDATION_TRIGGER_X} trips)`);
      return null;
    }
  } catch (err) {
    console.error(`[consolidation] maybeRunConsolidation failed for ${userId}:`, err.message);
    return null;
  }
}

module.exports = { runConsolidation, maybeRunConsolidation };

