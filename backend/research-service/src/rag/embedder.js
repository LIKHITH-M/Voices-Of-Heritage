/**
 * research-service/src/rag/embedder.js
 *
 * Vector embedding generator.
 * Supports:
 *   1. Google Gemini Embeddings API (text-embedding-004) when GEMINI_API_KEY is present
 *   2. Fast deterministic normalized hash-vector fallback (128-dim) for offline / test environments
 */

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const EMBEDDING_DIM = 128;

/**
 * generateFallbackEmbedding(text)
 * Deterministic character and word n-gram feature hashing with L2 normalization.
 */
function generateFallbackEmbedding(text = '', dim = EMBEDDING_DIM) {
  const vec = new Float32Array(dim);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return Array.from(vec);
  }

  // Word unigram + bigram hashing
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let h1 = 0;
    for (let c = 0; c < w.length; c++) {
      h1 = (h1 * 31 + w.charCodeAt(c)) >>> 0;
    }
    vec[h1 % dim] += 1.0;

    if (i < words.length - 1) {
      const bi = `${w}_${words[i + 1]}`;
      let h2 = 0;
      for (let c = 0; c < bi.length; c++) {
        h2 = (h2 * 37 + bi.charCodeAt(c)) >>> 0;
      }
      vec[h2 % dim] += 0.5;
    }
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

/**
 * embedText(text)
 *
 * Generates an embedding vector for the given string.
 */
async function embedText(text) {
  if (!text || typeof text !== 'string') {
    return generateFallbackEmbedding('');
  }

  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'placeholder_gemini_key') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
      const response = await axios.post(
        url,
        {
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        },
        { timeout: 5000 }
      );

      if (response.data?.embedding?.values) {
        return response.data.embedding.values;
      }
    } catch (err) {
      console.warn('[embedder] Gemini API embedding unavailable, falling back to local vectorizer:', err.message);
    }
  }

  // Offline / deterministic fallback
  return generateFallbackEmbedding(text);
}

module.exports = {
  embedText,
  generateFallbackEmbedding,
};

