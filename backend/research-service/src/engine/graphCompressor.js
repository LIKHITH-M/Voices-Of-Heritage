/**
 * research-service/src/engine/graphCompressor.js
 *
 * Graph-to-Context Compression Engine.
 *
 * Compresses the rich PTKG graph retrieval output into a compact, high-density
 * natural language prompt block formatted specifically for LLM consumption.
 *
 * Enforces token limits (default: 1500 tokens ~ 6000 chars) to prevent prompt
 * overflow while preserving high-confidence personal preferences and site metadata.
 */

const config = require('../config/default');

/**
 * getConfidenceLabel(confidence)
 */
function getConfidenceLabel(conf) {
  if (conf >= 0.75) return 'high confidence';
  if (conf >= 0.45) return 'moderate confidence';
  return 'emerging preference';
}

/**
 * compressContextForPrompt(retrievalResult, maxTokens = config.MAX_CONTEXT_TOKENS)
 *
 * @param {object} retrievalResult - Output of retrieveContextForDestination()
 * @param {number} maxTokens - Token limit (1 token ≈ 4 characters)
 * @returns {string} Formatted context block ready for prompt injection
 */
function compressContextForPrompt(retrievalResult, maxTokens = config.MAX_CONTEXT_TOKENS) {
  if (!retrievalResult) return '';

  const maxChars = maxTokens * 4;
  const { metadata, likedPreferences = [], avoidedPreferences = [], visitedSiteIds = [], candidateSites = [] } = retrievalResult;

  const sections = [];

  // 1. Header & Traveler Profile
  sections.push('=== PERSONAL TRAVEL KNOWLEDGE GRAPH (PTKG) CONTEXT ===');
  if (metadata.isColdStart) {
    sections.push('[PROFILE] Cold Start Traveler (No prior consolidated trip history yet. Rely on explicit prompt inputs with high receptivity to discovery).');
  } else {
    sections.push(`[PROFILE] Experienced Heritage Traveler (History: ${metadata.totalTrips || 1} previous trips consolidated in knowledge graph).`);
  }

  // 2. Learned Liked Preferences
  if (likedPreferences.length > 0) {
    const likeLines = likedPreferences.map(p => {
      const conf = getConfidenceLabel(p.confidence);
      const drift = p.driftFlag ? ' [Recent Shift Detected]' : '';
      return `  • ${p.dimension.toUpperCase()}: "${p.value}" (affinity: +${p.affinity.toFixed(2)}, ${conf})${drift}`;
    });
    sections.push('[LEARNED POSITIVE PREFERENCES - Prioritize these]:\n' + likeLines.join('\n'));
  }

  // 3. Avoided Preferences
  if (avoidedPreferences.length > 0) {
    const avoidLines = avoidedPreferences.map(p => {
      const conf = getConfidenceLabel(p.confidence);
      return `  • AVOID ${p.dimension.toUpperCase()}: "${p.value}" (negative affinity: ${p.affinity.toFixed(2)}, ${conf})`;
    });
    sections.push('[AVOIDED / NEGATIVE PREFERENCES - Avoid or minimize]:\n' + avoidLines.join('\n'));
  }

  // 4. Visited Sites (Encourage novelty)
  if (visitedSiteIds.length > 0) {
    sections.push(`[PREVIOUSLY VISITED SITES]: ${visitedSiteIds.join(', ')} (Prioritize unvisited sites unless user explicitly asks to revisit).`);
  }

  // 5. Ranked Candidate Heritage Sites
  if (candidateSites.length > 0) {
    const siteLines = candidateSites.slice(0, 10).map((s, idx) => {
      const matchStr = (s.matchedPreferences && s.matchedPreferences.length > 0)
        ? ` | Matched: ${s.matchedPreferences.map(m => m.value).join(', ')}`
        : '';
      const visitedStr = s.isVisited ? ' [Previously Visited]' : '';
      const fee = s.entryFeeINR ? `₹${s.entryFeeINR}` : 'Free';
      const duration = s.avgVisitDurationHours ? `${s.avgVisitDurationHours}h` : '2h';

      return `${idx + 1}. ${s.name} (${s.district || s.region}) - Rating: ${s.rating || 4.5}★, Dur: ${duration}, Fee: ${fee}${visitedStr}${matchStr}`;
    });
    sections.push('[TOP RETRIEVED HERITAGE SITES - In-region candidates ranked by personal affinity score]:\n' + siteLines.join('\n'));
  }

  sections.push('=== END OF PTKG CONTEXT ===\n');

  let fullText = sections.join('\n\n');

  // Truncate safely if exceeding token limit
  if (fullText.length > maxChars) {
    fullText = fullText.slice(0, maxChars) + '\n... [PTKG context truncated to fit token budget]\n=== END OF PTKG CONTEXT ===\n';
  }

  return fullText;
}

module.exports = {
  compressContextForPrompt,
  getConfidenceLabel,
};

