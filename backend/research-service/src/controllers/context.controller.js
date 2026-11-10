/**
 * research-service/src/controllers/context.controller.js
 *
 * Controller for retrieving PTKG-driven personalized context:
 *   GET /api/research/context/:userId
 */

const { retrieveContextForDestination } = require('../engine/graphRetrieval');
const { compressContextForPrompt } = require('../engine/graphCompressor');

/**
 * GET /api/research/context/:userId
 *
 * Query params:
 *   - destination (e.g. "Hampi", "Rajasthan")
 *   - region (e.g. "Karnataka")
 *   - duration (e.g. 3)
 *   - groupSize (e.g. 2)
 *   - interests (comma-separated or array)
 */
async function getContext(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const destination = req.query.destination || '';
    const region = req.query.region || '';
    const duration = parseInt(req.query.duration, 10) || 3;
    const groupSize = parseInt(req.query.groupSize, 10) || 1;

    let interests = [];
    if (req.query.interests) {
      if (Array.isArray(req.query.interests)) {
        interests = req.query.interests;
      } else {
        interests = String(req.query.interests).split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const contextPack = await retrieveContextForDestination(userId, {
      destination,
      region,
      duration,
      groupSize,
      interests,
    });

    const compressedContext = compressContextForPrompt(contextPack);

    res.json({
      success: true,
      data: {
        ...contextPack,
        compressedContext,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getContext,
};
