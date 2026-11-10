/**
 * ai-planner-service/src/depkg/engine/verifier.js
 *
 * Constraint Verification Engine.
 * Verifies schema validity, spatio-temporal transit feasibility, and daily fatigue.
 */

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
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

function checkSchema(it) {
  const f = [], w = [];
  if (!it || typeof it !== 'object') {
    f.push('CHECK1: Not an object');
    return { failures: f, warnings: w };
  }
  if (!Array.isArray(it.itinerary) || !it.itinerary.length) {
    f.push('CHECK1: Empty itinerary');
  }
  for (const d of it.itinerary || []) {
    if (!Array.isArray(d.activities)) {
      f.push(`CHECK1: Day ${d.day} missing activities`);
    }
  }
  return { failures: f, warnings: w };
}

function checkDuplicates(it) {
  const f = [], w = [];
  const seenSites = new Map();
  const seenEvening = new Set();

  for (const d of it?.itinerary || []) {
    const dayNum = d.day;
    const activities = d.activities || [];

    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      const nameKey = (act.activity || act.name || '').trim().toLowerCase();
      const locKey = (act.location?.name || '').trim().toLowerCase();
      const stableId = act.siteId ? `id:${String(act.siteId).toLowerCase()}` : '';
      const identityKeys = [
        stableId,
        nameKey ? `name:${nameKey}` : '',
        locKey ? `location:${locKey}` : '',
      ].filter(Boolean);

      // Duplicate site check
      const priorKey = identityKeys.find(key => seenSites.has(key));
      if (priorKey) {
        f.push(`DUPLICATE: "${act.activity || act.name || act.location?.name}" appears on Day ${dayNum} but was already scheduled on Day ${seenSites.get(priorKey)}.`);
      } else {
        identityKeys.forEach(key => seenSites.set(key, dayNum));
      }

      // Repetitive evening check
      const isEvening = i === activities.length - 1 || (act.time && act.time.startsWith('17'));
      if (isEvening && nameKey) {
        if (seenEvening.has(nameKey)) {
          f.push(`REPETITIVE_EVENING: Day ${dayNum} repeats evening activity "${act.activity}". Each evening must be a distinct cultural experience.`);
        } else {
          seenEvening.add(nameKey);
        }
      }
    }
  }

  return { failures: f, warnings: w };
}

function checkFeasibility(it, contextPack = {}) {
  const f = [], w = [];
  const avoided = (contextPack.travelerPreferences?.avoided || []).map(p => String(p.value).toLowerCase());

  for (const d of it?.itinerary || []) {
    const activities = d.activities || [];
    let dayActivityTime = 0;
    let dayTravelTime = 0;

    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      const dur = typeof act.duration === 'number' ? act.duration : parseFloat(act.duration) || 1.5;
      dayActivityTime += dur;

      // Negative preference check
      if (avoided.length > 0) {
        const text = `${act.activity || ''} ${act.name || ''}`.toLowerCase();
        for (const avoidVal of avoided) {
          if (text.includes(avoidVal)) {
            w.push(`Day ${d.day}: "${act.activity || act.name}" may conflict with avoided preference "${avoidVal}"`);
          }
        }
      }

      // Distance check between consecutive activities
      if (i < activities.length - 1) {
        const next = activities[i + 1];
        const c1 = act.location?.coordinates;
        const c2 = next.location?.coordinates;
        const hasCoordinates = c => Number.isFinite(c?.lat) && Number.isFinite(c?.lng);
        if (hasCoordinates(c1) && hasCoordinates(c2)) {
          const dist = haversineDistanceKm(c1.lat, c1.lng, c2.lat, c2.lng);
          const transitHours = (dist / 35.0) + (10 / 60);
          dayTravelTime += transitHours;
          if (dist > 50) {
            f.push(`EXCESSIVE_DISTANCE: Day ${d.day} has ${Math.round(dist)}km transit between "${act.activity}" and "${next.activity}" (limit: 50km).`);
          }
        } else {
          dayTravelTime += 0.25;
        }
      }
    }

    const totalDayTime = dayActivityTime + dayTravelTime;
    if (totalDayTime > 13.0) {
      f.push(`CHECK4: Day ${d.day} has ${totalDayTime.toFixed(1)}h total load (>13h limit)`);
    } else if (totalDayTime > 10.0) {
      w.push(`CHECK4: Day ${d.day} tightly scheduled (${totalDayTime.toFixed(1)}h total)`);
    }
  }
  return { failures: f, warnings: w };
}

function verifyItinerary(itinerary, contextPack) {
  const failures = [];
  const warnings = [];

  const c1 = checkSchema(itinerary);
  failures.push(...c1.failures);
  warnings.push(...c1.warnings);

  const c2 = checkDuplicates(itinerary);
  failures.push(...c2.failures);
  warnings.push(...c2.warnings);

  const c4 = checkFeasibility(itinerary, contextPack);
  failures.push(...c4.failures);
  warnings.push(...c4.warnings);

  const passed = failures.length === 0;
  const score = Math.max(1, Math.min(5, Math.round((5 - failures.length * 1.5 - warnings.length * 0.2) * 10) / 10));

  return { passed, score, failures, warnings };
}

module.exports = { verifyItinerary, haversineDistanceKm };
