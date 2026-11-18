/**
 * ai-planner-service/src/services/itineraryEngine.js
 *
 * Core Geographic & Algorithmic Itinerary Generation Engine.
 * Follows the 10-step strict pipeline:
 *   1. User Requirements
 *   2. Destination/Region Scope Filtering
 *   3. Candidate Sub-Sites Selection
 *   4. Remove Invalid/Out-of-Scope Locations
 *   5. Distance/Route Clustering
 *   6. Select Unique Sites (Zero Repetition)
 *   7. Daily Scheduling (Diverse Day & Evening Activities)
 *   8. LLM Personalization (PTKG Alignment)
 *   9. Constraint Verification & Automated Repair
 *   10. Final Itinerary
 */

const {
  parseDestinationScope,
  orderHubsGeographically,
  allocateDaysToHubs,
  haversineDistanceKm,
} = require('./heritageKnowledge');

/**
 * Estimates travel time in hours based on road distance
 */
function estimateTravelHours(distKm) {
  if (distKm <= 0.8) return 0.15; // ~9 mins walking
  const hours = distKm / 35.0 + 10 / 60; // 35 km/h urban/rural mix + 10 min parking/buffer
  return Math.round(hours * 10) / 10;
}

/**
 * Generates an itinerary strictly adhering to geographic contiguity,
 * zero site duplication, and non-repetitive evening cultural activities.
 */
function generateCoherentItinerary({
  destination,
  duration,
  travelStyle = 'balanced',
  budget = { min: 5000, max: 30000, currency: 'INR' },
  interests = [],
  groupSize = 1,
  ptkgContext = {},
  mode = 'research',
}) {
  const numDays = Math.max(1, parseInt(duration) || 1);

  // 1. Destination Scope Filtering
  const matchingHubs = parseDestinationScope(destination);
  if (matchingHubs.length === 0) {
    return {
      destination, duration: numDays, generationMode: mode, itinerary: [],
      totalEstimatedCost: { amount: 0, currency: 'INR' },
      heritageHighlights: [], localCuisineRecommendations: [],
      personalizationSummary: 'No verified heritage destination matches this request.',
      error: 'unsupported_destination',
    };
  }
  if (numDays < matchingHubs.length) {
    return {
      destination, duration: numDays, generationMode: mode, itinerary: [],
      totalEstimatedCost: { amount: 0, currency: 'INR' },
      personalizationSummary: 'The requested destination list needs at least one day per heritage circuit.',
      error: 'insufficient_duration',
    };
  }

  // 2. Geographic Route Clustering (Nearest Neighbor to prevent backtracking)
  const orderedHubs = orderHubsGeographically(matchingHubs);

  // 3. Proportional Day Allocation across Hubs
  const dayAllocations = allocateDaysToHubs(orderedHubs, numDays);

  // 4. Personalization & Preference Matching (DEPKG Experiences + PTKG)
  const likedPrefs = ptkgContext.likedPreferences || [];
  const avoidedPrefs = (ptkgContext.avoidedPreferences || []).map((p) =>
    String(p.value || p).toLowerCase()
  );

  // Detect temporal & crowd preferences learned from past Experiences
  const prefersMorning = likedPrefs.some((p) =>
    /morning|sunrise|early/i.test(String(p.value || ''))
  ) || avoidedPrefs.some((v) => /afternoon|crowd/i.test(v));
  const morningPrefObj = likedPrefs.find((p) => /morning|sunrise|early/i.test(String(p.value || '')))
    || (ptkgContext.avoidedPreferences || []).find((p) => /afternoon|crowd/i.test(String(p.value || '')));

  const prefersLowCrowd = likedPrefs.some((p) => /low[- ]crowd|peaceful|quiet|less crowded/i.test(String(p.value || '')))
    || avoidedPrefs.some((v) => /crowd/i.test(v));
  const prefersShortWalk = likedPrefs.some((p) => /shorter walk/i.test(String(p.value || '')))
    || avoidedPrefs.some((v) => /long walk/i.test(v));
  const rainSensitive = likedPrefs.some((p) => /indoor|rain/i.test(String(p.value || '')))
    || avoidedPrefs.some((v) => /rain/i.test(v));

  const likedDishes = likedPrefs
    .filter((p) => p.dimension === 'dish' || p.dimension === 'cuisine')
    .map((p) => p.value);

  // 5. Track used places to guarantee ZERO duplication across all days
  const usedSubSiteIds = new Set();
  const usedLocationNames = new Set();
  const usedEveningActivities = new Set();

  const days = [];
  let totalCostAmount = 0;

  for (let d = 0; d < dayAllocations.length; d++) {
    const dayNum = d + 1;
    const { hub, dayInHub } = dayAllocations[d];

    // Candidate sub-sites for this hub (excluding any already used)
    const availableSubSites = (hub.subSites || []).filter((s) => {
      if (usedSubSiteIds.has(s.siteId) || usedLocationNames.has(s.name.toLowerCase())) {
        return false;
      }
      // Check negative preferences
      const siteText = `${s.name} ${s.heritage_note} ${(s.category || '')}`.toLowerCase();
      if (avoidedPrefs.some((avoid) => avoid.length >= 4 && !/crowd|afternoon|rain|walk|heat/.test(avoid) && siteText.includes(avoid))) {
        return false;
      }
      return true;
    });

    // Sort available sub-sites by preference affinity (DEPKG + PTKG)
    availableSubSites.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      const textA = `${a.name} ${a.heritage_note || ''} ${a.preferenceMatchTag || ''} ${a.category || ''} ${a.desc || ''}`.toLowerCase();
      const textB = `${b.name} ${b.heritage_note || ''} ${b.preferenceMatchTag || ''} ${b.category || ''} ${b.desc || ''}`.toLowerCase();
      likedPrefs.forEach((p) => {
        const val = String(p.value || '').toLowerCase();
        const tokens = val.split(/\s+/).filter((t) => t.length >= 4);
        const weight = Number(p.confidence || 0.6) * 4;
        if (textA.includes(val) || tokens.some((tok) => textA.includes(tok))) scoreA += weight;
        if (textB.includes(val) || tokens.some((tok) => textB.includes(tok))) scoreB += weight;
      });
      return scoreB - scoreA;
    });

    // Select up to three verified daytime attractions (respecting shorter walking preference if set)
    const dayActivities = [];
    const times = prefersMorning ? ['07:30', '10:00', '15:30'] : ['09:00', '11:30', '14:30'];
    const maxSlots = prefersShortWalk ? 2 : 3;

    for (let slot = 0; slot < Math.min(maxSlots, availableSubSites.length); slot++) {
      let chosenSite = availableSubSites.shift();

      usedSubSiteIds.add(chosenSite.siteId);
      usedLocationNames.add(chosenSite.name.toLowerCase());

      // Check preference match for rich explainability
      const siteHaystack = `${chosenSite.name} ${chosenSite.heritage_note || ''} ${chosenSite.preferenceMatchTag || ''} ${chosenSite.category || ''} ${chosenSite.desc || ''}`.toLowerCase();
      const matchedPref = likedPrefs.find((p) => {
        const val = String(p.value || '').toLowerCase();
        const tokens = val.split(/\s+/).filter((t) => t.length >= 4);
        return siteHaystack.includes(val) || tokens.some((tok) => siteHaystack.includes(tok));
      });

      const explainParts = [];
      if (matchedPref) {
        const srcCite = matchedPref.explainability ? ` (${matchedPref.explainability})` : '';
        explainParts.push(`Matches your preference for ${matchedPref.value}${srcCite}`);
      }
      if (slot === 0 && prefersMorning) {
        const cite = morningPrefObj?.explainability ? ` — ${morningPrefObj.explainability}` : '';
        explainParts.push(`Scheduled early at ${times[0]} to avoid afternoon crowds${cite}`);
      }
      if (prefersLowCrowd && slot === 0 && !explainParts.some((e) => /crowd/i.test(e))) {
        explainParts.push('Early quiet-hour slot chosen for low-crowd preference');
      }
      if (rainSensitive) {
        explainParts.push('Covered pavilion/indoor fallback advised if rain occurs');
      }

      const prefExplain = explainParts.length
        ? `Personalized via DEPKG: ${explainParts.join('; ')}`
        : `Curated for ${hub.name} heritage circuit (${chosenSite.preferenceMatchTag || 'architectural landmark'})`;

      dayActivities.push({
        time: times[slot],
        activity: chosenSite.name,
        location: {
          name: chosenSite.name,
          address: `${hub.district || hub.name}, ${hub.state}`,
          coordinates: chosenSite.coordinates || hub.coordinates,
        },
        duration: chosenSite.duration || 2.0,
        cost: { amount: chosenSite.entryFeeINR || 0, currency: 'INR' },
        description: chosenSite.desc,
        type: chosenSite.category === 'temple' ? 'attraction' : chosenSite.category === 'palace' ? 'attraction' : 'activity',
        heritage_note: chosenSite.heritage_note,
        siteId: chosenSite.siteId,
        preferenceMatch: prefExplain,
      });

      totalCostAmount += chosenSite.entryFeeINR || 0;
    }

    // Select 1 unique evening experience (never repeated across days)
    const availableEvening = (hub.eveningExperiences || []).filter(
      (e) => !usedEveningActivities.has(e.activity)
    );

    const chosenEvening = availableEvening[0];
    if (chosenEvening) {
      usedEveningActivities.add(chosenEvening.activity);
      dayActivities.push({
      time: '17:30',
      activity: chosenEvening.activity,
      location: {
        name: chosenEvening.location,
        address: `${hub.district || hub.name}, ${hub.state}`,
        coordinates: chosenEvening.coordinates || hub.coordinates,
      },
      duration: chosenEvening.duration || 1.5,
      cost: { amount: chosenEvening.cost || 0, currency: 'INR' },
      description: chosenEvening.desc,
      type: chosenEvening.type === 'food_and_market' ? 'dining' : 'activity',
      heritage_note: `Local living tradition and cultural preservation in ${hub.name}.`,
      siteId: null,
      preferenceMatch: `Curated evening experience: ${chosenEvening.type.replace(/_/g, ' ')}`,
      });
      totalCostAmount += chosenEvening.cost || 0;
    }

    // Day title reflecting the actual hub explored
    const hubDayTitle =
      orderedHubs.length > 1
        ? `Day ${dayNum} — ${hub.name}: Part ${dayInHub}`
        : `Day ${dayNum} — ${hub.name}${dayActivities[0] ? `: ${dayActivities[0].activity.split('&')[0].trim()}` : ''}`;

    days.push({
      day: dayNum,
      title: hubDayTitle,
      heritage_summary: `Exploration of ${hub.dynasty || hub.name} monuments: ${dayActivities
        .slice(0, 3)
        .map((a) => a.activity.split('&')[0].trim())
        .join(' • ')}`,
      activities: dayActivities,
    });
  }

  // Curate unique highlights and local cuisines from all visited hubs
  const allHighlights = orderedHubs.flatMap((h) =>
    (h.subSites || []).slice(0, 2).map((s) => `${s.name} (${h.name})`)
  );
  const allCuisines = Array.from(new Set([...likedDishes, ...orderedHubs.flatMap((h) => h.cuisines || [])]));

  return {
    destination,
    duration: numDays,
    generationMode: mode,
    totalEstimatedCost: {
      amount: totalCostAmount,
      currency: 'INR',
    },
    heritageTheme: `${orderedHubs.map((h) => h.name).join(' → ')} Heritage Corridor & Living Traditions`,
    personalizationSummary:
      ptkgContext.metadata?.isColdStart === false
        ? `Personalized via DEPKG: Tailored route through ${orderedHubs.map((h) => h.name).join(', ')} honoring your preferences (${likedPrefs.slice(0, 5).map((p) => p.value).join(', ')})${avoidedPrefs.length ? ` while avoiding ${avoidedPrefs.slice(0, 3).join(', ')}` : ''}.`
      : `Curated from verified project locations across ${orderedHubs.map((h) => h.name).join(' → ')} with no repeated attractions.`,
    depkgExplainability: likedPrefs.slice(0, 5).map((p) => ({
      preference: p.value,
      dimension: p.dimension,
      confidence: p.confidence,
      reason: p.explainability || 'Derived from your recorded travel experiences',
    })),
    itinerary: days,
    heritageHighlights: allHighlights.slice(0, 5),
    localCuisineRecommendations: allCuisines.slice(0, 5),
  };
}

/**
 * Validates and repairs an itinerary (whether produced by LLM or rule engine)
 * to guarantee no duplicates, no out-of-scope destinations, and diverse evening experiences.
 */
function validateAndRepairItinerary(itineraryData, destinationQuery, ptkgContext = {}) {
  if (!itineraryData || !Array.isArray(itineraryData.itinerary)) {
    return generateCoherentItinerary({
      destination: destinationQuery,
      duration: 3,
      ptkgContext,
    });
  }

  const allowedHubs = parseDestinationScope(destinationQuery);
  if (allowedHubs.length === 0) {
    return { destination: destinationQuery, itinerary: [], _repaired: true, error: 'unsupported_destination' };
  }
  const allowedSynonyms = allowedHubs.flatMap((h) => h.synonyms || []);

  const seenActivities = new Set();
  const seenLocations = new Set();
  const seenSiteIds = new Set();
  const seenEveningActivities = new Set();
  let hasRepairs = false;

  const repairedDays = [];

  for (let d = 0; d < itineraryData.itinerary.length; d++) {
    const day = itineraryData.itinerary[d];
    const hubForDay = allowedHubs[d % allowedHubs.length];
    const availablePool = [...(hubForDay.subSites || [])];
    const availableEveningPool = [...(hubForDay.eveningExperiences || [])];

    const repairedActivities = [];

    for (let a = 0; a < (day.activities || []).length; a++) {
      const act = day.activities[a];
      const actTitleLower = (act.activity || act.name || '').toLowerCase();
      const locNameLower = (act.location?.name || '').toLowerCase();
      const isEvening = a === (day.activities.length - 1) || (act.time && act.time.startsWith('17'));

      // 1. Out-of-scope destination check:
      // Does this activity mention distant destinations not in allowedHubs?
      const BANNED_OUT_OF_SCOPE = [
        'gokarna',
        'meenakshi',
        'brihadisvara',
        'mahabalipuram',
        'madurai',
        'thanjavur',
        'pattadakal',
        'badami',
        'delhi',
        'agra',
        'jaipur',
      ];

      const violatesScope = BANNED_OUT_OF_SCOPE.some((banned) => {
        const isBannedWord = actTitleLower.includes(banned) || locNameLower.includes(banned);
        const isAllowedByQuery = allowedSynonyms.some((syn) => syn.includes(banned));
        return isBannedWord && !isAllowedByQuery;
      });

      const matchedSite = allowedHubs.flatMap((hub) => (hub.subSites || []).map(site => ({ hub, site }))).find(({ site }) => {
        const name = site.name.toLowerCase();
        return (act.siteId && site.siteId === act.siteId) || name === actTitleLower || name === locNameLower || actTitleLower.includes(name);
      });
      const matchedEvening = allowedHubs.flatMap((hub) => (hub.eveningExperiences || []).map(experience => ({ hub, experience })))
        .find(({ experience }) => experience.activity.toLowerCase() === actTitleLower);
      const isKnownSite = !!matchedSite;
      const isKnownEvening = !!matchedEvening;
      const unknownPlace = !isKnownSite && !isKnownEvening;

      // 2. Duplicate place check
      const isDuplicate = seenActivities.has(actTitleLower) || seenLocations.has(locNameLower) ||
        (matchedSite && seenSiteIds.has(matchedSite.site.siteId));

      // 3. Repeated evening check
      const isRepeatedEvening = isEvening && seenEveningActivities.has(actTitleLower);

      if (violatesScope || unknownPlace || isDuplicate || isRepeatedEvening) {
        hasRepairs = true;

        if (isEvening) {
          // Find unused evening experience
          const unusedEvening = availableEveningPool.find(
            (e) => !seenEveningActivities.has(e.activity.toLowerCase())
          );
          if (unusedEvening) {
            seenEveningActivities.add(unusedEvening.activity.toLowerCase());
            repairedActivities.push({
              time: act.time || '17:30',
              activity: unusedEvening.activity,
              location: {
                name: unusedEvening.location,
                address: `${hubForDay.district || hubForDay.name}, ${hubForDay.state}`,
                coordinates: unusedEvening.coordinates || hubForDay.coordinates,
              },
              duration: unusedEvening.duration || 1.5,
              cost: { amount: unusedEvening.cost || 0, currency: 'INR' },
              description: unusedEvening.desc,
              type: 'activity',
              heritage_note: `Evening cultural experience in ${hubForDay.name}.`,
              siteId: null,
              preferenceMatch: 'Curated evening experience',
            });
            continue;
          }
        }

        // Daytime repair: find unused sub-site from hub
      const unusedSite = availablePool.find(
          (s) => !seenActivities.has(s.name.toLowerCase()) && !seenLocations.has(s.name.toLowerCase())
        );

        if (unusedSite) {
          seenActivities.add(unusedSite.name.toLowerCase());
          seenLocations.add(unusedSite.name.toLowerCase());
          seenSiteIds.add(unusedSite.siteId);
          repairedActivities.push({
            time: act.time || '10:00',
            activity: unusedSite.name,
            location: {
              name: unusedSite.name,
              address: `${hubForDay.district || hubForDay.name}, ${hubForDay.state}`,
              coordinates: unusedSite.coordinates || hubForDay.coordinates,
            },
            duration: unusedSite.duration || 2.0,
            cost: { amount: unusedSite.entryFeeINR || 0, currency: 'INR' },
            description: unusedSite.desc,
            type: unusedSite.category === 'temple' ? 'attraction' : 'activity',
            heritage_note: unusedSite.heritage_note,
            siteId: unusedSite.siteId,
            preferenceMatch: `Curated for ${hubForDay.name} circuit (${unusedSite.preferenceMatchTag || 'heritage monument'})`,
          });
          continue;
        }
        // Do not retain an unverified or out-of-scope LLM location.
        if (violatesScope || unknownPlace || isDuplicate || isRepeatedEvening) continue;
      }

      // Valid activity: register and keep
      if (matchedSite) {
        const { hub, site } = matchedSite;
        seenActivities.add(site.name.toLowerCase());
        seenLocations.add(site.name.toLowerCase());
        seenSiteIds.add(site.siteId);
        repairedActivities.push({
          ...act,
          activity: site.name,
          siteId: site.siteId,
          location: {
            ...act.location,
            name: site.name,
            address: `${hub.district || hub.name}, ${hub.state}`,
            coordinates: site.coordinates || hub.coordinates,
          },
          duration: site.duration || act.duration,
          cost: { amount: site.entryFeeINR || 0, currency: 'INR' },
        });
      } else if (matchedEvening) {
        const { hub, experience } = matchedEvening;
        seenEveningActivities.add(experience.activity.toLowerCase());
        repairedActivities.push({
          ...act,
          activity: experience.activity,
          location: {
            ...act.location,
            name: experience.location,
            address: `${hub.district || hub.name}, ${hub.state}`,
            coordinates: experience.coordinates || hub.coordinates,
          },
          duration: experience.duration || act.duration,
          cost: { amount: experience.cost || 0, currency: 'INR' },
        });
      } else {
        seenActivities.add(actTitleLower);
        if (locNameLower) seenLocations.add(locNameLower);
        if (isEvening) seenEveningActivities.add(actTitleLower);
        repairedActivities.push(act);
      }
    }

    repairedDays.push({
      ...day,
      activities: repairedActivities,
    });
  }

  return {
    ...itineraryData,
    itinerary: repairedDays,
    _repaired: hasRepairs,
  };
}

module.exports = {
  generateCoherentItinerary,
  validateAndRepairItinerary,
  estimateTravelHours,
};

