/**
 * research-service/src/controllers/rag.controller.js
 *
 * Controller for RAG endpoints:
 *   POST /api/research/rag/index -> Triggers full re-indexing of knowledge chunks
 *   POST /api/research/rag/query -> Retrieves top-K semantically relevant heritage chunks
 */

const { indexAllHeritageSites, retrieveRelevantHeritageChunks } = require('../rag/retriever');

/**
 * POST /api/research/rag/index
 */
async function triggerIndex(req, res, next) {
  try {
    const result = await indexAllHeritageSites();
    res.json({
      success: true,
      message: 'Knowledge base indexed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/research/rag/query
 * Body: { query, region, limit, minScore }
 */
async function queryRAG(req, res, next) {
  try {
    const { query, region, limit, minScore } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query text is required' });
    }

    const chunks = await retrieveRelevantHeritageChunks(query, {
      region,
      limit: parseInt(limit, 10) || 5,
      minScore: parseFloat(minScore) || 0.2,
    });

    res.json({
      success: true,
      count: chunks.length,
      data: chunks,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  triggerIndex,
  queryRAG,
};

