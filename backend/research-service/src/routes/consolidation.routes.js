/**
 * research-service/src/routes/consolidation.routes.js
 *
 * Manual consolidation and preference retrieval endpoints.
 * Base path: /api/research
 */

const express = require('express');
const router = express.Router();
const { runConsolidation } = require('../engine/consolidationEngine');
const PreferenceSnapshot = require('../models/preference.model');
const { handleValidationErrors } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

/**
 * POST /api/research/consolidate
 * Manually trigger preference consolidation for a user.
 * Body: { userId }
 */
router.post('/consolidate',
  body('userId').notEmpty().withMessage('userId is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const result = await runConsolidation(req.body.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/research/preferences/:userId
 * Get learned preference snapshots for a user.
 * Query: status (like|avoid|weak|retired), dimension, limit
 */
router.get('/preferences/:userId',
  param('userId').notEmpty(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { status, dimension, limit = 50 } = req.query;

      const filter = { userId };
      if (status) filter.status = status;
      if (dimension) filter.dimension = dimension;

      const prefs = await PreferenceSnapshot.find(filter)
        .sort({ affinity: -1 })
        .limit(Number(limit))
        .lean();

      // Group by dimension for easier frontend consumption
      const grouped = prefs.reduce((acc, p) => {
        if (!acc[p.dimension]) acc[p.dimension] = [];
        acc[p.dimension].push(p);
        return acc;
      }, {});

      res.json({
        success: true,
        total: prefs.length,
        grouped,
        raw: prefs,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

