const { v4: uuidv4 } = require('uuid');
const { DEPKGTraveller, DEPKGTrip, DEPKGEpisode, DEPKGConsolidationRun, DEPKGPreferenceSnapshot } = require('../models/depkgModels');
const { computePreferenceUpdates } = require('./inferenceEngine');
const config = require('../config/default');

async function runConsolidation(travellerId) {
  const traveller = await DEPKGTraveller.findOne({ userId: travellerId });
  if (!traveller) throw new Error(`Traveller not found: ${travellerId}`);
  const unconsolidated = await DEPKGTrip.find({ travellerId, isConsolidated:false, status:'completed' }).sort({ tripIndex:1 });
  if (unconsolidated.length < config.CONSOLIDATION_TRIGGER_X) return { skipped:true };
  const tripIds = unconsolidated.map(t=>t._id.toString()).sort().join(',');
  const idempotencyKey = `${travellerId}::${tripIds}`;
  const existing = await DEPKGConsolidationRun.findOne({ idempotencyKey });
  if (existing?.status === 'completed') return { skipped:true, runId:existing.runId };
  const runId = uuidv4();
  const run = await DEPKGConsolidationRun.create({ travellerId, runId, tripsIncluded:unconsolidated.map(t=>t._id), tripIndexRange:{min:Math.min(...unconsolidated.map(t=>t.tripIndex)),max:Math.max(...unconsolidated.map(t=>t.tripIndex))}, idempotencyKey, status:'running' });
  try {
    const allEpisodes = await DEPKGEpisode.find({ travellerId }).lean();
    const updates = computePreferenceUpdates(allEpisodes);
    let created=0,updated=0,retired=0,driftFlagged=0;
    for (const pref of updates) {
      const r = await DEPKGPreferenceSnapshot.findOneAndUpdate({ travellerId, dimension:pref.dimension, value:pref.value }, { $set:{ affinity:pref.affinity, confidence:pref.confidence, status:pref.status, positiveWeightedSum:pref.positiveWeightedSum, negativeWeightedSum:pref.negativeWeightedSum, effectiveN:pref.effectiveN, driftFlag:pref.driftFlag, recentAffinity:pref.recentAffinity, olderAffinity:pref.olderAffinity, supportingEpisodes:pref.supportingEpisodeIds, contradictingEpisodes:pref.contradictingEpisodeIds, mostRecentTripIndex:pref.mostRecentTripIndex, lastConsolidationRunId:runId, lastConsolidatedAt:new Date() } }, { upsert:true, new:true, rawResult:true });
      if (r.lastErrorObject?.upserted) created++; else updated++;
      if (pref.status==='retired') retired++;
      if (pref.driftFlag) driftFlagged++;
    }
    await DEPKGTrip.updateMany({ _id:{ $in:unconsolidated.map(t=>t._id) } }, { $set:{ isConsolidated:true, consolidatedAt:new Date(), consolidationRunId:runId } });
    await DEPKGTraveller.updateOne({ userId:travellerId }, { $set:{ lastConsolidatedAt:new Date(), unconsolidatedTripsCount:0 } });
    await DEPKGConsolidationRun.updateOne({ runId }, { $set:{ status:'completed', completedAt:new Date(), preferencesCreated:created, preferencesUpdated:updated, preferencesRetired:retired, driftFlagged } });
    return { runId, status:'completed', preferencesCreated:created, preferencesUpdated:updated };
  } catch(err) {
    await DEPKGConsolidationRun.updateOne({ runId }, { $set:{ status:'failed', completedAt:new Date(), errorMessage:err.message } });
    throw err;
  }
}

async function maybeRunConsolidation(travellerId) {
  const t = await DEPKGTraveller.findOne({ userId:travellerId });
  if (!t) return;
  if (t.unconsolidatedTripsCount >= config.CONSOLIDATION_TRIGGER_X) return runConsolidation(travellerId);
  return { skipped:true };
}
module.exports = { runConsolidation, maybeRunConsolidation };
