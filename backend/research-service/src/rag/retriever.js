/**
 * research-service/src/rag/retriever.js
 *
 * RAG Retriever for external heritage knowledge.
 *
 * Matches incoming user trip context (destination, user preferences, requested themes)
 * against indexed heritage knowledge chunks using vector cosine similarity.
 */

const { getCachedChunks, cosineSimilarity, RAGChunk } = require('./vectorStore');
const { embedText } = require('./embedder');
const { chunkHeritageSite } = require('./chunker');
const HeritageSite = require('../models/heritageSite.model');
const config = require('../config/default');

/**
 * indexAllHeritageSites()
 * Chunks and embeds all HeritageSite documents in the database.
 */
async function indexAllHeritageSites() {
  console.log('[rag] Indexing all heritage sites into RAG vector store...');
  const sites = await HeritageSite.find({ isActive: true }).lean();
  let indexedCount = 0;

  for (const site of sites) {
    const siteChunks = chunkHeritageSite(site);
    for (const chunk of siteChunks) {
      const embedding = await embedText(chunk.text);
      await RAGChunk.findOneAndUpdate(
        { chunkId: chunk.chunkId },
        {
          $set: {
            siteId: chunk.siteId,
            siteName: chunk.siteName,
            region: chunk.region,
            section: chunk.section,
            text: chunk.text,
            embedding,
            metadata: chunk.metadata,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      indexedCount++;
    }
  }

  // Invalidate in-memory cache
  await getCachedChunks(true);
  console.log(`[rag] Successfully indexed ${indexedCount} chunks across ${sites.length} sites.`);
  return { indexedCount, sitesCount: sites.length };
}

/**
 * retrieveRelevantHeritageChunks(queryText, options)
 *
 * @param {string} queryText - Query string (e.g. "Dravidian architecture in Hampi")
 * @param {object} options - { region, limit, minScore }
 * @returns {Array<object>} Ranked relevant knowledge chunks
 */
async function retrieveRelevantHeritageChunks(queryText, options = {}) {
  const { region = '', limit = config.RAG_TOP_K_CHUNKS, minScore = 0.2 } = options;

  if (!queryText || queryText.trim() === '') {
    return [];
  }

  const queryEmbedding = await embedText(queryText);
  let chunks = await getCachedChunks();

  // If cache is empty, attempt initial auto-indexing if MongoDB connected
  const mongoose = require('mongoose');
  if ((!chunks || chunks.length === 0) && mongoose.connection.readyState === 1) {
    try {
      await indexAllHeritageSites();
      chunks = await getCachedChunks(true);
    } catch (e) {
      console.warn('[rag] Auto-index attempt on empty store failed:', e.message);
    }
  }

  // Resilient fallback from authoritative heritageKnowledge if MongoDB is offline/empty
  if (!chunks || chunks.length === 0) {
    try {
      const { HERITAGE_HUBS } = require('../../../ai-planner-service/src/services/heritageKnowledge');
      const fallbackChunks = [];
      for (const hub of Object.values(HERITAGE_HUBS)) {
        for (const sub of (hub.subSites || [])) {
          const text = `${sub.name} in ${hub.name}, ${hub.region}. Category: ${sub.category}. Architecture: ${(hub.archStyle || []).join(', ')}. Dynasty: ${hub.dynasty}. Description: ${sub.desc}. Cultural significance: ${sub.heritage_note}. Known for: ${sub.preferenceMatchTag || sub.name}.`;
          const emb = await embedText(text);
          fallbackChunks.push({
            chunkId: `chunk_${sub.siteId}`,
            siteId: sub.siteId,
            siteName: sub.name,
            region: hub.region,
            section: 'overview',
            text,
            embedding: emb,
            metadata: { hubId: hub.id, dynasty: hub.dynasty },
          });
        }
      }
      chunks = fallbackChunks;
    } catch (e) {
      console.warn('[rag] Fallback corpus indexing failed:', e.message);
    }
  }

  if (!chunks || chunks.length === 0) {
    return [];
  }

  const scored = [];
  for (const chunk of chunks) {
    // Optional region filter
    if (region && chunk.region && !chunk.region.toLowerCase().includes(region.toLowerCase())) {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    if (similarity >= minScore) {
      scored.push({
        chunkId: chunk.chunkId,
        siteId: chunk.siteId,
        siteName: chunk.siteName,
        region: chunk.region,
        section: chunk.section,
        text: chunk.text,
        similarity: Math.round(similarity * 1000) / 1000,
        metadata: chunk.metadata,
      });
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}

module.exports = {
  indexAllHeritageSites,
  retrieveRelevantHeritageChunks,
};

