/**
 * research-service/src/controllers/ptkg.controller.js
 *
 * Controller for PTKG endpoints:
 *   - GET  /api/research/ptkg/:userId          -> High-level PTKG summary
 *   - GET  /api/research/ptkg/:userId/graph    -> Full nodes/edges for graph visualization
 *   - GET  /api/research/ptkg/:userId/preferences -> Filtered preference nodes
 *   - POST /api/research/ptkg/:userId/build    -> Trigger manual/on-demand PTKG rebuild
 */

const ptkgManager = require('../engine/ptkgManager');

/**
 * GET /api/research/ptkg/:userId
 */
async function getSummary(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const summary = await ptkgManager.getPTKGSummary(userId);
    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/research/ptkg/:userId/graph
 */
async function getGraph(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const graphData = await ptkgManager.getPTKGForVisualization(userId);
    res.json({
      success: true,
      data: graphData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/research/ptkg/:userId/preferences
 * Query params: status (like|avoid, default like), limit (default 15)
 */
async function getPreferences(req, res, next) {
  try {
    const { userId } = req.params;
    const status = req.query.status || 'like';
    const limit = parseInt(req.query.limit, 10) || 15;

    const prefs = await ptkgManager.getPreferenceNodes(userId, status, limit);
    res.json({
      success: true,
      count: prefs.length,
      data: prefs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/research/ptkg/:userId/build
 */
async function triggerBuild(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const result = await ptkgManager.buildPTKG(userId);
    res.json({
      success: true,
      message: 'PTKG successfully rebuilt',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getGraph,
  getPreferences,
  triggerBuild,
};

