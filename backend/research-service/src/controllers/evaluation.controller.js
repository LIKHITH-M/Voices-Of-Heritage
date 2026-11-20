/**
 * research-service/src/controllers/evaluation.controller.js
 *
 * Controller for logging and querying evaluation metrics:
 *   POST /api/research/evaluation/log
 *   GET  /api/research/evaluation/metrics
 *   GET  /api/research/evaluation/metrics/:userId
 */

const { logExperiment, getComparativeMetrics } = require('../engine/evaluationLogger');

/**
 * POST /api/research/evaluation/log
 */
async function logRun(req, res, next) {
  try {
    const saved = await logExperiment(req.body);
    res.json({
      success: true,
      message: 'Experiment run logged',
      data: { runId: saved.runId },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/research/evaluation/metrics
 * GET /api/research/evaluation/metrics/:userId
 */
async function getMetrics(req, res, next) {
  try {
    const userId = req.params.userId || req.query.userId || null;
    const comparison = await getComparativeMetrics(userId);
    res.json({
      success: true,
      data: comparison,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/research/evaluation/seed
 * Seed benchmark Mode A (Baseline) vs Mode B (Research PTKG) comparative experiments
 */
async function seedBenchmark(req, res, next) {
  try {
    const ExperimentLog = require('../models/experiment.model');
    const { v4: uuidv4 } = require('uuid');

    const sampleRuns = [
      {
        runId: `run_res_${uuidv4().slice(0, 8)}`,
        userId: 'benchmark_researcher',
        destination: 'Hampi, Karnataka',
        mode: 'research',
        durationDays: 3,
        generationTimeMs: 1680,
        verificationScore: 5,
        ptkgContextUsed: true,
        ragChunksUsed: 4,
        metrics: {
          preferenceAlignmentScore: 0.88,
          constraintSatisfactionRate: 1.0,
          spatioTemporalEfficiency: 0.92,
          diversityScore: 0.80,
          averageDailyHours: 6.5,
          totalEstimatedCost: 14500,
        },
      },
      {
        runId: `run_base_${uuidv4().slice(0, 8)}`,
        userId: 'benchmark_researcher',
        destination: 'Hampi, Karnataka',
        mode: 'baseline',
        durationDays: 3,
        generationTimeMs: 1420,
        verificationScore: 4,
        ptkgContextUsed: false,
        ragChunksUsed: 0,
        metrics: {
          preferenceAlignmentScore: 0.40,
          constraintSatisfactionRate: 0.82,
          spatioTemporalEfficiency: 0.74,
          diversityScore: 0.45,
          averageDailyHours: 7.2,
          totalEstimatedCost: 18200,
        },
      },
      {
        runId: `run_res_${uuidv4().slice(0, 8)}`,
        userId: 'benchmark_researcher',
        destination: 'Mysore, Karnataka',
        mode: 'research',
        durationDays: 4,
        generationTimeMs: 1720,
        verificationScore: 5,
        ptkgContextUsed: true,
        ragChunksUsed: 5,
        metrics: {
          preferenceAlignmentScore: 0.92,
          constraintSatisfactionRate: 0.98,
          spatioTemporalEfficiency: 0.89,
          diversityScore: 0.76,
          averageDailyHours: 6.2,
          totalEstimatedCost: 19800,
        },
      },
      {
        runId: `run_base_${uuidv4().slice(0, 8)}`,
        userId: 'benchmark_researcher',
        destination: 'Mysore, Karnataka',
        mode: 'baseline',
        durationDays: 4,
        generationTimeMs: 1390,
        verificationScore: 4,
        ptkgContextUsed: false,
        ragChunksUsed: 0,
        metrics: {
          preferenceAlignmentScore: 0.35,
          constraintSatisfactionRate: 0.80,
          spatioTemporalEfficiency: 0.71,
          diversityScore: 0.48,
          averageDailyHours: 7.8,
          totalEstimatedCost: 23400,
        },
      },
      {
        runId: `run_res_${uuidv4().slice(0, 8)}`,
        userId: 'benchmark_researcher',
        destination: 'Varanasi, Uttar Pradesh',
        mode: 'research',
        durationDays: 3,
        generationTimeMs: 1640,
        verificationScore: 5,
        ptkgContextUsed: true,
        ragChunksUsed: 4,
        metrics: {
          preferenceAlignmentScore: 0.85,
          constraintSatisfactionRate: 0.95,
          spatioTemporalEfficiency: 0.91,
          diversityScore: 0.82,
          averageDailyHours: 6.0,
          totalEstimatedCost: 12200,
        },
      },
      {
        runId: `run_base_${uuidv4().slice(0, 8)}`,
        userId: 'benchmark_researcher',
        destination: 'Varanasi, Uttar Pradesh',
        mode: 'baseline',
        durationDays: 3,
        generationTimeMs: 1410,
        verificationScore: 3,
        ptkgContextUsed: false,
        ragChunksUsed: 0,
        metrics: {
          preferenceAlignmentScore: 0.38,
          constraintSatisfactionRate: 0.78,
          spatioTemporalEfficiency: 0.69,
          diversityScore: 0.42,
          averageDailyHours: 7.5,
          totalEstimatedCost: 16500,
        },
      },
    ];

    await ExperimentLog.insertMany(sampleRuns);
    const comparison = await getComparativeMetrics();
    res.json({
      success: true,
      message: 'Benchmark experiments seeded successfully',
      data: comparison,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  logRun,
  getMetrics,
  seedBenchmark,
};

