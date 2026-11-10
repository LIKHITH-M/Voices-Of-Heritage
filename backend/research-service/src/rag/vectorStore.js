/**
 * research-service/src/rag/vectorStore.js
 *
 * Mongoose schema and store for RAG chunks.
 * Stores text passages with their vector embeddings and metadata.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const RAGChunkSchema = new Schema(
  {
    chunkId: { type: String, unique: true, required: true, index: true },
    siteId: { type: String, required: true, index: true },
    siteName: { type: String, required: true },
    region: { type: String, index: true },
    section: String, // 'overview', 'architecture', 'history', 'highlights'
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'rag_chunks',
  }
);

RAGChunkSchema.index({ siteId: 1, region: 1 });

const RAGChunk = mongoose.models.RAGChunk || mongoose.model('RAGChunk', RAGChunkSchema);

// In-memory cache of chunks for fast vector similarity search without heavy vector DB
let chunkCache = null;
let lastCacheUpdate = 0;

/**
 * getCachedChunks()
 */
async function getCachedChunks(forceReload = false) {
  const now = Date.now();
  if (!forceReload && chunkCache && (now - lastCacheUpdate < 300000)) {
    return chunkCache;
  }
  if (mongoose.connection.readyState === 1) {
    try {
      chunkCache = await RAGChunk.find({}).lean();
      lastCacheUpdate = now;
      return chunkCache;
    } catch (err) {
      console.warn('[vectorStore] MongoDB find failed:', err.message);
    }
  }
  return chunkCache || [];
}

/**
 * cosineSimilarity(vecA, vecB)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);

  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  RAGChunk,
  getCachedChunks,
  cosineSimilarity,
};

