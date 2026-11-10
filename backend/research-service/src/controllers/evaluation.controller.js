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

module.exports = {
  logRun,
  getMetrics,
};

