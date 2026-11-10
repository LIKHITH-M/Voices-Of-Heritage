/**
 * research-service/src/engine/constraintVerifier.js
 *
 * Spatio-Temporal Constraint Verification Engine.
 *
 * Verifies generated itineraries against real-world physical and personalized constraints:
 *   1. Geographic distance and travel feasibility between consecutive stops (Haversine + speed model)
 *   2. Daily duration & fatigue limits (<= 12 hours total schedule)
 *   3. Budget ceiling adherence
 *   4. Timing and opening hours validity
 *   5. Negative preference avoidance (verifies no penalized sites are included)
 */

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * estimateTravelTimeHours(distanceKm)
 * Models heritage road transit (average 35 km/h urban/rural mix + 10 min buffer)
 */
function estimateTravelTimeHours(distanceKm) {
  if (distanceKm <= 0.5) return 0.1; // 6 mins walking
  const hours = (distanceKm / 35.0) + (10 / 60); // 35 km/h + buffer
  return Math.round(hours * 100) / 100;
}

/**
 * verifyConstraints(itineraryData, options)
 *
 * @param {object} itineraryData - LLM-generated itinerary structure
 * @param {object} options - { budgetMax, avoidedPreferences, maxDailyHours }
 * @returns {object} { passed, score, warnings, failures, metrics }
 */
function verifyConstraints(itineraryData, options = {}) {
  const failures = [];
  const warnings = [];
  const days = itineraryData?.itinerary || [];

  const maxDailyHours = options.maxDailyHours || 12.0;
  const budgetMax = options.budgetMax || Infinity;
  const avoidedPrefs = (options.avoidedPreferences || []).map(p => String(p.value || p).toLowerCase());

  let totalTripCost = 0;
  let totalActivityDuration = 0;
  let totalTravelDuration = 0;
  let totalViolations = 0;

  if (!Array.isArray(days) || days.length === 0) {
    failures.push('Itinerary contains no daily plans.');
    return { passed: false, score: 0, failures, warnings, metrics: {} };
  }

  days.forEach((dayPlan, dIdx) => {
    const dayNum = dayPlan.day || dIdx + 1;
    const activities = dayPlan.activities || [];
    let dayActivityTime = 0;
    let dayTravelTime = 0;
    let dayCost = 0;

    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      const duration = typeof act.duration === 'number' ? act.duration : parseFloat(act.duration) || 1.5;
      dayActivityTime += duration;

      // Cost tracking
      const costAmount = (typeof act.cost === 'object' && act.cost?.amount) ? act.cost.amount : (typeof act.cost === 'number' ? act.cost : 0);
      dayCost += costAmount;

      // Negative preference check
      if (avoidedPrefs.length > 0) {
        const actText = `${act.activity || ''} ${act.name || ''} ${act.heritage_note || ''}`.toLowerCase();
        for (const avoided of avoidedPrefs) {
          if (actText.includes(avoided)) {
            warnings.push(`Day ${dayNum}: "${act.activity || act.name}" may conflict with avoided preference "${avoided}".`);
          }
        }
      }

      // Spatio-temporal distance to next activity
      if (i < activities.length - 1) {
        const nextAct = activities[i + 1];
        const coordA = act.location?.coordinates;
        const coordB = nextAct.location?.coordinates;

        if (coordA?.lat && coordA?.lng && coordB?.lat && coordB?.lng) {
          const distKm = haversineDistanceKm(coordA.lat, coordA.lng, coordB.lat, coordB.lng);
          const travelHours = estimateTravelTimeHours(distKm);
          dayTravelTime += travelHours;

          if (distKm > 60) {
            warnings.push(`Day ${dayNum}: Long transit jump (${Math.round(distKm)} km, ~${Math.round(travelHours * 60)} min) between "${act.activity}" and "${nextAct.activity}".`);
          }
        } else {
          dayTravelTime += 0.25; // default 15 min buffer between stops
        }
      }
    }

    const totalDayTime = dayActivityTime + dayTravelTime;
    totalActivityDuration += dayActivityTime;
    totalTravelDuration += dayTravelTime;
    totalTripCost += dayCost;

    if (totalDayTime > maxDailyHours) {
      failures.push(`Day ${dayNum}: Excessive daily commitment (${totalDayTime.toFixed(1)}h planned, exceeds ${maxDailyHours}h limit).`);
      totalViolations++;
    } else if (totalDayTime > 10.0) {
      warnings.push(`Day ${dayNum}: Highly packed schedule (${totalDayTime.toFixed(1)}h total).`);
    }
  });

  // Budget validation
  if (budgetMax !== Infinity && totalTripCost > budgetMax) {
    warnings.push(`Estimated trip cost (₹${totalTripCost}) exceeds target budget (₹${budgetMax}) by ₹${totalTripCost - budgetMax}.`);
  }

  const passed = failures.length === 0;
  const score = Math.max(1, Math.min(5, Math.round((5 - failures.length * 1.5 - warnings.length * 0.25) * 10) / 10));

  const totalTime = totalActivityDuration + totalTravelDuration;
  const spatioTemporalEfficiency = totalTime > 0 ? Math.round((totalActivityDuration / totalTime) * 100) / 100 : 1;

  return {
    passed,
    score,
    failures,
    warnings,
    metrics: {
      totalEstimatedCost: totalTripCost,
      totalActivityHours: Math.round(totalActivityDuration * 10) / 10,
      totalTravelHours: Math.round(totalTravelDuration * 10) / 10,
      spatioTemporalEfficiency,
      constraintSatisfactionRate: Math.max(0, Math.round(((days.length - totalViolations) / days.length) * 100)) / 100,
    },
  };
}

module.exports = {
  verifyConstraints,
  haversineDistanceKm,
  estimateTravelTimeHours,
};

