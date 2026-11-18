/**
 * ai-planner-service/src/routes/enhancedPrompt.js
 *
 * Research Mode Prompt Builder for VoH.
 * Enhances LLM prompt with:
 *   1. Personal Travel Knowledge Graph (PTKG) compressed context
 *   2. Retrieved RAG external heritage knowledge chunks
 *   3. Explicit preference-matching constraints & explainability directives
 */

const { parseDestinationScope } = require('../services/heritageKnowledge');

/**
 * buildPTKGEnhancedPrompt(reqBody, baseContextPack, ptkgContext, ragChunks)
 */
function buildPTKGEnhancedPrompt(reqBody, baseContextPack, ptkgContext = {}, ragChunks = []) {
  const { destination, duration, budget, travelStyle, interests, groupSize } = reqBody;

  // 1. Resolve exact destination scope
  const matchingHubs = parseDestinationScope(destination);
  const hubNames = matchingHubs.map(h => h.name).join(', ');

  // 2. Curate sub-sites strictly from matched hubs
  const candidateSubSites = matchingHubs.flatMap(h =>
    (h.subSites || []).map(s => `• [${h.name}] ${s.name} (${s.category}) | ~${s.duration}h | ₹${s.entryFeeINR} | ${s.heritage_note}`)
  ).slice(0, 20);

  // 3. PTKG + Live DEPKG Experiences Section
  const compressedPTKG = [
    ptkgContext.compressedContext || '',
    baseContextPack?.travelerPreferences?.compressedExperienceContext || '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // 4. RAG Heritage Knowledge Section
  let ragSection = '';
  if (ragChunks && ragChunks.length > 0) {
    const chunkSnippets = ragChunks.map((c, i) =>
      `[Knowledge Chunk ${i + 1}] (${c.siteName} - ${c.section}):\n${c.text}`
    ).join('\n\n');
    ragSection = `=== EXTERNAL HERITAGE KNOWLEDGE BASE (RAG) ===\n${chunkSnippets}\n=== END OF HERITAGE KNOWLEDGE ===\n`;
  }

  return `You are the lead AI researcher and heritage travel architect for Voices of Heritage (VoH).
Create a personalized, scientifically grounded ${duration}-day heritage itinerary strictly for "${destination}" (Covering: ${hubNames}).

TRIP SPECIFICATIONS:
• Travel Style: ${travelStyle || 'immersive heritage'}
• Budget: ₹${budget?.min || 5000} – ₹${budget?.max || 35000} (INR)
• Group Size: ${groupSize || 1}
• Requested Interests: ${(interests || []).join(', ') || 'historical architecture, living traditions'}

${compressedPTKG}

${ragSection}

VERIFIED HERITAGE MONUMENTS & SITES FOR THIS REGION:
${candidateSubSites.join('\n')}

STRICT SPATIAL & INTEGRITY REQUIREMENTS:
1. ZERO DUPLICATION: Never schedule the same monument, temple, or location on more than one day. Track used sites across all ${duration} days.
2. STRICT DESTINATION BOUNDS: Strictly restrict all activities to ${hubNames}. DO NOT introduce unrelated or distant destinations (e.g. do not add Gokarna, Madurai, or Mahabalipuram unless explicitly requested in "${destination}").
3. GEOGRAPHIC COHERENCE: Group geographically nearby monuments together on the same day (< 20 km between activities). Allocate days to regions sequentially without backtracking.
4. DIVERSE ACTIVITIES & EVENINGS: Do NOT repeat the same evening activity. Every evening (17:30) MUST be a distinct, authentic cultural experience (e.g., sunset viewpoint, living artisan workshop, temple aarti, or historic bazaar walk).
5. Explainability: For every single activity, provide an explicit "preferenceMatch" explaining how it aligns with the user's PTKG preferences or interests.

Return ONLY valid JSON (no markdown formatting, no code fence):
{
  "destination": "${destination}",
  "duration": ${duration},
  "generationMode": "research",
  "totalEstimatedCost": {"amount": 0, "currency": "INR"},
  "heritageTheme": "Specific historical dynasty or architectural theme explored",
  "personalizationSummary": "Detailed scientific summary of how the PTKG guided this plan",
  "itinerary": [
    {
      "day": 1,
      "title": "Day title emphasizing heritage era and specific hub",
      "heritage_summary": "Historical narrative explored on this day",
      "activities": [
        {
          "time": "09:00",
          "activity": "Activity or monument name",
          "location": {
            "name": "Monument name",
            "address": "Monument address or district",
            "coordinates": {"lat": 15.335, "lng": 76.461}
          },
          "duration": 2.0,
          "cost": {"amount": 50, "currency": "INR"},
          "description": "Engaging description of the visit experience",
          "type": "attraction",
          "heritage_note": "Detailed architectural style, dynasty, and historical significance",
          "siteId": "site_id_if_known",
          "preferenceMatch": "Why recommended: e.g. Matches your high affinity for Vijayanagara Dravidian architecture"
        }
      ]
    }
  ],
  "heritageHighlights": ["Key highlight 1", "Key highlight 2", "Key highlight 3"],
  "localCuisineRecommendations": ["Traditional regional dish 1", "Heritage food experience 2"]
}`;
}

module.exports = {
  buildPTKGEnhancedPrompt,
};

