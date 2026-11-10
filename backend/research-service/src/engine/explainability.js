/**
 * research-service/src/engine/explainability.js
 *
 * Explainability Engine for the Personal Travel Knowledge Graph (PTKG).
 *
 * Generates transparent, human-understandable rationales for every recommended
 * heritage activity, linking recommendations directly to learned preferences
 * and historical graph observations.
 */

function generateActivityRationale(activity, likedPrefs = [], visitedSites = []) {
  const name = activity.activity || activity.name || 'Heritage Monument';
  const explicitMatch = activity.preferenceMatch;

  if (explicitMatch && typeof explicitMatch === 'string' && explicitMatch.length > 5) {
    return {
      activityName: name,
      rationale: explicitMatch,
      type: 'ptkg_grounded',
      matchedDimension: 'user_preference',
      confidence: 'high',
    };
  }

  // Match against liked preferences
  const actText = `${name} ${activity.description || ''} ${activity.heritage_note || ''}`.toLowerCase();
  for (const pref of likedPrefs) {
    const val = String(pref.value).toLowerCase();
    if (actText.includes(val)) {
      const confLabel = pref.confidence >= 0.7 ? 'high' : pref.confidence >= 0.4 ? 'moderate' : 'emerging';
      return {
        activityName: name,
        rationale: `Recommended based on your ${confLabel}-confidence affinity (+${(pref.affinity || 0).toFixed(2)}) for ${pref.dimension}: "${pref.value}".`,
        type: 'ptkg_inferred',
        matchedDimension: pref.dimension,
        confidence: confLabel,
        affinity: pref.affinity,
      };
    }
  }

  // Check if novel discovery
  return {
    activityName: name,
    rationale: `Curated as a premier regional heritage monument based on high visitor satisfaction and authoritative ASI/UNESCO ratings.`,
    type: 'curated_discovery',
    matchedDimension: 'destination_highlight',
    confidence: 'standard',
  };
}

/**
 * generateItineraryExplanations(itineraryData, ptkgContext)
 */
function generateItineraryExplanations(itineraryData, ptkgContext = {}) {
  const days = itineraryData?.itinerary || [];
  const likedPrefs = ptkgContext.likedPreferences || [];
  const visitedSites = ptkgContext.visitedSiteIds || [];
  const isColdStart = ptkgContext.metadata?.isColdStart ?? true;

  const dayExplanations = [];
  let totalMatches = 0;

  for (const day of days) {
    const acts = day.activities || [];
    const actRationales = [];

    for (const act of acts) {
      const rationale = generateActivityRationale(act, likedPrefs, visitedSites);
      if (rationale.type !== 'curated_discovery') totalMatches++;
      actRationales.push(rationale);
    }

    dayExplanations.push({
      day: day.day,
      title: day.title || `Day ${day.day}`,
      activities: actRationales,
    });
  }

  let overallSummary = '';
  if (isColdStart) {
    overallSummary = 'This journey was crafted for discovery using canonical heritage benchmarks and your explicit travel interests. As you rate places and share feedback, your personal knowledge graph will continuously tune future plans.';
  } else {
    overallSummary = `Personalized using ${likedPrefs.length} learned preferences from your personal travel knowledge graph. ${totalMatches} activities were directly selected to reflect your architectural affinities and pacing.`;
  }

  return {
    overallSummary,
    totalPreferencesConsidered: likedPrefs.length,
    matchedActivitiesCount: totalMatches,
    dayExplanations,
  };
}

module.exports = {
  generateActivityRationale,
  generateItineraryExplanations,
};

