/**
 * research-service/src/engine/evaluationLogger.js
 *
 * Experiment logging and comparative evaluation framework.
 */

const { v4: uuidv4 } = require('uuid');
const ExperimentLog = require('../models/experiment.model');
const { calculateExperimentMetrics } = require('./metricsCalculator');

/**
 * logExperiment(runData)
 */
async function logExperiment(runData) {
  const runId = runData.runId || uuidv4();
  const metrics = runData.metrics || calculateExperimentMetrics(
    runData.itinerary,
    runData.ptkgContext,
    runData.verificationResult
  );

  const experiment = new ExperimentLog({
    runId,
    userId: runData.userId || 'anonymous',
    tripId: runData.tripId,
    destination: runData.destination || 'India Heritage',
    mode: runData.mode || 'baseline',
    durationDays: runData.durationDays || 3,
    generationTimeMs: runData.generationTimeMs || 0,
    verificationScore: runData.verificationScore || 5,
    ptkgContextUsed: !!runData.ptkgContextUsed,
    ragChunksUsed: runData.ragChunksUsed || 0,
    metrics,
    rawPromptLength: runData.rawPromptLength,
    completionTokensEst: runData.completionTokensEst,
    userAgent: runData.userAgent,
  });

  return experiment.save();
}

/**
 * getComparativeMetrics(userId)
 * Aggregates and compares Mode A vs Mode B across all logged runs.
 */
async function getComparativeMetrics(userId = null) {
  const match = userId ? { userId } : {};

  const runs = await ExperimentLog.find(match).sort({ createdAt: -1 }).limit(100).lean();

  const baselineRuns = runs.filter(r => r.mode === 'baseline');
  const researchRuns = runs.filter(r => r.mode === 'research');

  const aggregate = (arr) => {
    if (arr.length === 0) {
      return {
        count: 0,
        avgAlignment: 0,
        avgEfficiency: 0,
        avgConstraintSatisfaction: 0,
        avgDiversity: 0,
        avgLatencyMs: 0,
      };
    }
    const sum = arr.reduce((acc, cur) => {
      acc.alignment += cur.metrics?.preferenceAlignmentScore || 0;
      acc.efficiency += cur.metrics?.spatioTemporalEfficiency || 0;
      acc.constraint += cur.metrics?.constraintSatisfactionRate || 0;
      acc.diversity += cur.metrics?.diversityScore || 0;
      acc.latency += cur.generationTimeMs || 0;
      return acc;
    }, { alignment: 0, efficiency: 0, constraint: 0, diversity: 0, latency: 0 });

    const n = arr.length;
    return {
      count: n,
      avgAlignment: Math.round((sum.alignment / n) * 100) / 100,
      avgEfficiency: Math.round((sum.efficiency / n) * 100) / 100,
      avgConstraintSatisfaction: Math.round((sum.constraint / n) * 100) / 100,
      avgDiversity: Math.round((sum.diversity / n) * 100) / 100,
      avgLatencyMs: Math.round(sum.latency / n),
    };
  };

  return {
    totalExperiments: runs.length,
    baseline: aggregate(baselineRuns),
    research: aggregate(researchRuns),
    recentRuns: runs.slice(0, 10).map(r => ({
      runId: r.runId,
      destination: r.destination,
      mode: r.mode,
      metrics: r.metrics,
      createdAt: r.createdAt,
    })),
  };
}

module.exports = {
  logExperiment,
  getComparativeMetrics,
};

