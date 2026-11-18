/**
 * DEPKG / PTKG Knowledge Graph Bridge & Temporal Preference Inference Engine
 *
 * Strictly separates:
 *   1. Facts        (e.g., User visited Mysore Palace on 12 Dec 2026)
 *   2. Experiences  (e.g., User rated Mysore Palace 5/5 with crowd=5)
 *   3. Preferences  (Explicitly stated user preferences, high confidence)
 *   4. Inferences   (Implicit behavioral patterns — require repeated evidence before high confidence)
 *
 * Preserves episodic context, temporal decay (recency weighting), drift/evolution tracking,
 * positive & negative evidence, and explainability citations for future AI trip planning.
 */

const mongoose = require('mongoose');
const Experience = require('../models/Experience');
const localExpStore = require('../utils/localExperienceStore');
const {
  DEPKGTraveller,
  DEPKGTrip,
  DEPKGEpisode,
  DEPKGPreferenceSnapshot,
} = require('../depkg/models/depkgModels');
const { maybeRunConsolidation } = require('../depkg/engine/consolidationEngine');

const isMongoConnected = () => mongoose.connection.readyState === 1;

// Exponential temporal decay half-life in days (newer evidence weighs more strongly)
const HALF_LIFE_DAYS = 180;

function computeTemporalWeight(timestamp) {
  const ts = new Date(timestamp || Date.now()).getTime();
  if (Number.isNaN(ts)) return 1.0;
  const ageDays = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60 * 24));
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

function normalizeTag(str) {
  return String(str || '').trim();
}

/**
 * Rebuild a user's complete DEPKG graph (Facts, Experiences, Explicit Preferences,
 * Inferred Preferences, Temporal Evolution, and Explainability) from all their active experiences.
 * Because it rebuilds deterministically from persisted experiences, edits and deletions
 * immediately clean bad data out of the graph!
 */
async function rebuildUserDEPKG(userId) {
  let experiences = [];
  if (isMongoConnected()) {
    try {
      experiences = await Experience.find({ userId }).sort({ visitedAt: 1, createdAt: 1 }).lean();
    } catch {
      experiences = localExpStore.getAllByUser(userId).reverse();
    }
  } else {
    experiences = localExpStore.getAllByUser(userId).reverse();
  }

  const facts = [];
  const experienceNodes = [];
  const signalBuckets = new Map(); // key: `${dimension}::${value.toLowerCase()}`

  const addSignal = ({
    dimension,
    value,
    polarity, // 'positive' | 'negative'
    evidenceType, // 'explicit' | 'inferred'
    strength = 1.0,
    episode,
    timestamp,
  }) => {
    const cleanVal = normalizeTag(value);
    if (!cleanVal) return;
    const key = `${dimension}::${cleanVal.toLowerCase()}`;
    if (!signalBuckets.has(key)) {
      signalBuckets.set(key, {
        dimension,
        value: cleanVal,
        observations: [],
      });
    }
    signalBuckets.get(key).observations.push({
      polarity,
      evidenceType,
      strength,
      weight: computeTemporalWeight(timestamp),
      timestamp: timestamp || new Date().toISOString(),
      episode,
    });
  };

  for (const exp of experiences) {
    const ts = exp.visitedAt || exp.createdAt || new Date().toISOString();
    const place = exp.placeName || exp.title || exp.destination || 'Heritage Site';
    const epRef = {
      experienceId: exp.experienceId || String(exp._id),
      tripId: exp.tripId || null,
      placeName: place,
      destination: exp.destination || exp.region || '',
      date: ts,
      rating: exp.ratings?.overall ?? null,
      experienceType: exp.experienceType,
      visitStatus: exp.visitStatus,
      freeTextSnippet: exp.freeTextFeedback ? exp.freeTextFeedback.slice(0, 140) : '',
    };

    // ── 1. FACT NODES (Objective actual behaviour) ──
    if (['visited', 'partially_visited', 'different_from_planned'].includes(exp.visitStatus)) {
      facts.push({
        type: 'fact',
        subject: userId,
        predicate: exp.visitStatus === 'visited' ? 'visited' : exp.visitStatus,
        object: place,
        tripId: exp.tripId,
        destination: exp.destination || exp.region,
        experienceType: exp.experienceType,
        timestamp: ts,
      });
    } else if (['not_visited', 'cancelled', 'could_not_visit'].includes(exp.visitStatus)) {
      facts.push({
        type: 'fact',
        subject: userId,
        predicate: exp.visitStatus === 'cancelled' ? 'cancelled' : 'skipped',
        object: place,
        tripId: exp.tripId,
        reason: exp.actualData?.skippedReason || '',
        timestamp: ts,
      });
    }

    // ── 2. EXPERIENCE NODES (Episodic evaluation record) ──
    if (exp.feedbackStatus === 'completed' || exp.ratings?.overall || exp.freeTextFeedback) {
      experienceNodes.push({
        type: 'experience',
        experienceId: epRef.experienceId,
        tripId: exp.tripId,
        placeName: place,
        experienceType: exp.experienceType,
        rating: exp.ratings?.overall ?? null,
        sentiment: exp.sentiment || 'neutral',
        crowdLevel: exp.ratings?.crowdLevel ?? null,
        wouldVisitAgain: exp.wouldVisitAgain,
        wouldRecommend: exp.wouldRecommend,
        weatherCondition: exp.weatherContext?.condition || null,
        timestamp: ts,
      });
    }

    // ── 3. EXPLICIT PREFERENCES (Directly stated by user) ──
    (exp.enjoyedTags || []).forEach((tag) => {
      addSignal({ dimension: 'interest', value: tag, polarity: 'positive', evidenceType: 'explicit', strength: 1.0, episode: epRef, timestamp: ts });
    });

    (exp.dislikedTags || []).forEach((tag) => {
      addSignal({ dimension: 'interest', value: tag, polarity: 'negative', evidenceType: 'explicit', strength: 1.0, episode: epRef, timestamp: ts });
    });

    (exp.nextTimePreferences || []).forEach((pref) => {
      const lower = pref.toLowerCase();
      const dim = lower.includes('crowd')
        ? 'crowd'
        : lower.includes('morning') || lower.includes('evening') || lower.includes('afternoon')
        ? 'time_of_day'
        : lower.includes('walk')
        ? 'walking'
        : lower.includes('food')
        ? 'cuisine'
        : lower.includes('spiritual') || lower.includes('peaceful')
        ? 'wellness'
        : lower.includes('cost') || lower.includes('premium')
        ? 'budget'
        : 'planning_preference';
      const isAvoid = lower.startsWith('avoid ');
      addSignal({
        dimension: dim,
        value: pref,
        polarity: isAvoid ? 'negative' : 'positive',
        evidenceType: 'explicit',
        strength: 1.15,
        episode: epRef,
        timestamp: ts,
      });
    });

    // Extracted structured knowledge from free-text feedback
    const ext = exp.extractedKnowledge || {};
    (ext.positives || []).forEach((p) => {
      if (!(exp.enjoyedTags || []).includes(p)) {
        addSignal({ dimension: 'interest', value: p, polarity: 'positive', evidenceType: 'explicit', strength: 0.9, episode: epRef, timestamp: ts });
      }
    });
    (ext.negatives || []).forEach((n) => {
      if (!(exp.dislikedTags || []).includes(n)) {
        const dim = /crowd/i.test(n) ? 'crowd' : /rain|heat/i.test(n) ? 'weather' : /walk/i.test(n) ? 'walking' : 'avoidance';
        addSignal({ dimension: dim, value: n, polarity: 'negative', evidenceType: 'explicit', strength: 0.9, episode: epRef, timestamp: ts });
      }
    });
    (ext.temporalPreferences || []).forEach((tp) => {
      addSignal({
        dimension: 'time_of_day',
        value: tp.label || tp.value,
        polarity: tp.polarity === 'negative' ? 'negative' : 'positive',
        evidenceType: 'explicit',
        strength: 1.1,
        episode: epRef,
        timestamp: ts,
      });
    });
    (ext.weatherImpacts || []).forEach((wi) => {
      addSignal({
        dimension: 'weather',
        value: wi.futureSignal || `Avoid outdoor ${wi.weather}`,
        polarity: 'positive',
        evidenceType: 'explicit',
        strength: 1.0,
        episode: epRef,
        timestamp: ts,
      });
    });

    // Food Heritage signals
    if (exp.experienceType === 'food' && exp.foodDetails) {
      const r = Number(exp.ratings?.overall || exp.ratings?.taste || 0);
      if (exp.foodDetails.dish && r > 0) {
        addSignal({
          dimension: 'dish',
          value: exp.foodDetails.dish,
          polarity: r >= 4 ? 'positive' : r <= 2 ? 'negative' : 'positive',
          evidenceType: 'explicit',
          strength: r >= 4 || r <= 2 ? 1.0 : 0.4,
          episode: epRef,
          timestamp: ts,
        });
      }
      if (exp.foodDetails.cuisine && r >= 4) {
        addSignal({ dimension: 'cuisine', value: `${exp.foodDetails.cuisine} cuisine`, polarity: 'positive', evidenceType: 'explicit', strength: 0.95, episode: epRef, timestamp: ts });
      }
      if (exp.foodDetails.region && r >= 4) {
        addSignal({ dimension: 'cuisine', value: `${exp.foodDetails.region} cuisine`, polarity: 'positive', evidenceType: 'inferred', strength: 0.75, episode: epRef, timestamp: ts });
      }
      if (Number(exp.ratings?.authenticity || 0) >= 4) {
        addSignal({ dimension: 'cuisine', value: 'Traditional & authentic local food', polarity: 'positive', evidenceType: 'inferred', strength: 0.85, episode: epRef, timestamp: ts });
      }
      (exp.foodDetails.favouriteDishes || []).forEach((d) => {
        addSignal({ dimension: 'dish', value: d, polarity: 'positive', evidenceType: 'explicit', strength: 1.0, episode: epRef, timestamp: ts });
      });
      (exp.foodDetails.dislikedDishes || []).forEach((d) => {
        addSignal({ dimension: 'dish', value: d, polarity: 'negative', evidenceType: 'explicit', strength: 1.0, episode: epRef, timestamp: ts });
      });
    }

    // Wellness & Spiritual signals
    if (exp.experienceType === 'wellness') {
      const r = Number(exp.ratings?.overall || 0);
      if (Number(exp.ratings?.peacefulness || 0) >= 4 && r >= 4) {
        addSignal({ dimension: 'atmosphere', value: 'Peaceful places', polarity: 'positive', evidenceType: 'inferred', strength: 0.9, episode: epRef, timestamp: ts });
      }
      if (exp.wellnessDetails?.experienceSubType && r >= 4) {
        addSignal({ dimension: 'wellness', value: `${exp.wellnessDetails.experienceSubType} experiences`, polarity: 'positive', evidenceType: 'explicit', strength: 0.95, episode: epRef, timestamp: ts });
      }
      if (exp.wellnessDetails?.preferredTime) {
        addSignal({ dimension: 'time_of_day', value: `${exp.wellnessDetails.preferredTime} spiritual activities`, polarity: 'positive', evidenceType: 'explicit', strength: 1.0, episode: epRef, timestamp: ts });
      }
    }

    // Smart Stay signals
    if (exp.experienceType === 'stay' && exp.moduleMetadata) {
      const r = Number(exp.ratings?.overall || 0);
      if (exp.moduleMetadata.ecoFriendly && r >= 4) {
        addSignal({ dimension: 'stay', value: 'Eco-certified stays', polarity: 'positive', evidenceType: 'inferred', strength: 0.8, episode: epRef, timestamp: ts });
      }
      if (exp.moduleMetadata.propertyType && r >= 4) {
        addSignal({ dimension: 'stay', value: exp.moduleMetadata.propertyType, polarity: 'positive', evidenceType: 'inferred', strength: 0.8, episode: epRef, timestamp: ts });
      }
    }

    // ── 4. IMPLICIT INFERENCES (Lower confidence until repeated — Section 19!) ──
    const overall = Number(exp.ratings?.overall || 0);
    const crowd = Number(exp.ratings?.crowdLevel || 0);
    if (crowd >= 4 && overall > 0 && overall <= 3) {
      // Single crowded low-rating episode produces LOW-confidence inference ("Possible crowd sensitivity"), NOT a permanent rule!
      addSignal({
        dimension: 'crowd',
        value: 'Highly crowded sites',
        polarity: 'negative',
        evidenceType: 'inferred',
        strength: 0.75,
        episode: epRef,
        timestamp: ts,
      });
    } else if (crowd > 0 && crowd <= 2 && overall >= 4) {
      addSignal({
        dimension: 'crowd',
        value: 'Low-crowd experiences',
        polarity: 'positive',
        evidenceType: 'inferred',
        strength: 0.75,
        episode: epRef,
        timestamp: ts,
      });
    }

    // Skipped / cancelled behavioral inference (low confidence unless repeated)
    if (exp.visitStatus === 'not_visited' || exp.visitStatus === 'cancelled') {
      if (exp.plannedData?.activityName) {
        addSignal({
          dimension: 'skipped_activity',
          value: exp.plannedData.activityName,
          polarity: 'negative',
          evidenceType: 'inferred',
          strength: 0.6,
          episode: epRef,
          timestamp: ts,
        });
      }
    }
  }

  // ── Compute Weighted Affinity, Confidence, Status & Temporal Evolution ──
  const explicitPreferences = [];
  const inferences = [];
  const liked = [];
  const avoided = [];
  const evolution = [];

  for (const [, bucket] of signalBuckets.entries()) {
    const obs = bucket.observations;
    let posWeight = 0;
    let negWeight = 0;
    let totalWeight = 0;
    let hasExplicit = false;

    for (const o of obs) {
      if (o.evidenceType === 'explicit') hasExplicit = true;
      const eff = o.weight * o.strength;
      if (o.polarity === 'positive') posWeight += eff;
      else negWeight += eff;
      totalWeight += o.weight;
    }

    const kappa = hasExplicit ? 0.35 : 0.9; // Higher damping for purely inferred signals (prevents single-event over-claiming!)
    const affinity = Number(((posWeight - negWeight) / (totalWeight + kappa)).toFixed(3));
    const nMin = hasExplicit ? 1.2 : 2.5; // Explicit reaches high confidence fast; inferred needs >=2-3 repeated episodes
    const confidence = Number(Math.min(0.98, Math.abs(affinity) * Math.min(1, totalWeight / nMin) + (hasExplicit ? 0.15 : 0)).toFixed(2));
    const confidenceLevel = confidence >= 0.7 ? 'high' : confidence >= 0.45 ? 'medium' : 'low';

    // Detect temporal preference shift/evolution when >=2 timestamped observations exist
    let driftFlag = false;
    let evolutionNote = null;
    if (obs.length >= 2) {
      const sorted = [...obs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const mid = Math.floor(sorted.length / 2);
      const older = sorted.slice(0, mid);
      const recent = sorted.slice(mid);
      const avgPol = (arr) => arr.reduce((acc, x) => acc + (x.polarity === 'positive' ? 1 : -1), 0) / arr.length;
      const oldScore = avgPol(older);
      const recScore = avgPol(recent);
      if (Math.sign(oldScore) !== Math.sign(recScore) && Math.abs(recScore - oldScore) >= 0.5) {
        driftFlag = true;
        evolutionNote = `Preference shifted from ${oldScore > 0 ? 'positive' : 'negative'} (${older[0].timestamp.slice(0, 10)}) to ${recScore > 0 ? 'positive' : 'negative'} (${recent[recent.length - 1].timestamp.slice(0, 10)})`;
        evolution.push({
          dimension: bucket.dimension,
          value: bucket.value,
          note: evolutionNote,
          olderDate: older[0].timestamp,
          recentDate: recent[recent.length - 1].timestamp,
        });
      }
    }

    const status =
      affinity >= 0.2 && confidence >= 0.35
        ? 'like'
        : affinity <= -0.2 && confidence >= 0.35
        ? 'avoid'
        : 'tentative';

    const latestTs = obs.reduce((max, o) => (new Date(o.timestamp) > new Date(max) ? o.timestamp : max), obs[0].timestamp);

    const supportingEpisodes = obs
      .filter((o) => (affinity >= 0 ? o.polarity === 'positive' : o.polarity === 'negative'))
      .map((o) => o.episode)
      .slice(-5);

    const contradictingEpisodes = obs
      .filter((o) => (affinity >= 0 ? o.polarity === 'negative' : o.polarity === 'positive'))
      .map((o) => o.episode)
      .slice(-3);

    const explainability = supportingEpisodes.length
      ? `Based on ${supportingEpisodes.length} experience(s), including ${supportingEpisodes[supportingEpisodes.length - 1].placeName}`
      : 'Derived from recorded travel feedback';

    const prefObj = {
      dimension: bucket.dimension,
      value: bucket.value,
      affinity,
      confidence,
      confidenceLevel,
      status,
      evidenceType: hasExplicit ? 'explicit' : 'inferred',
      observationCount: obs.length,
      positiveEvidence: Number(posWeight.toFixed(2)),
      negativeEvidence: Number(negWeight.toFixed(2)),
      lastObservedAt: latestTs,
      driftFlag,
      evolutionNote,
      explainability,
      supportingEpisodes,
      contradictingEpisodes,
    };

    if (hasExplicit) {
      explicitPreferences.push(prefObj);
    } else {
      inferences.push(prefObj);
    }

    // Only promote to active planner likes/avoids when confidence meets threshold (or explicit)
    if (status === 'like') liked.push(prefObj);
    if (status === 'avoid') avoided.push(prefObj);
  }

  liked.sort((a, b) => b.confidence - a.confidence || b.affinity - a.affinity);
  avoided.sort((a, b) => b.confidence - a.confidence || a.affinity - b.affinity);
  explicitPreferences.sort((a, b) => b.confidence - a.confidence);
  inferences.sort((a, b) => b.confidence - a.confidence);

  // Build compressed natural-language context for RAG/LLM prompt injection
  const topLikes = liked.slice(0, 10);
  const topAvoids = avoided.slice(0, 8);
  const recentEvidence = experienceNodes.slice(-6).reverse();

  let compressedContext = '';
  if (topLikes.length > 0 || topAvoids.length > 0 || recentEvidence.length > 0) {
    compressedContext = [
      '=== PERSONAL TRAVEL EXPERIENCE KNOWLEDGE GRAPH (DEPKG) ===',
      `User History: ${facts.filter((f) => f.predicate === 'visited').length} visited places, ${experienceNodes.length} feedback episodes.`,
      topLikes.length
        ? `USER PREFERS:\n${topLikes.map((p) => `- [${p.dimension}] ${p.value} (${p.evidenceType}, conf: ${Math.round(p.confidence * 100)}%) — ${p.explainability}`).join('\n')}`
        : '',
      topAvoids.length
        ? `USER DISLIKES / AVOIDS:\n${topAvoids.map((p) => `- [${p.dimension}] ${p.value} (${p.evidenceType}, conf: ${Math.round(p.confidence * 100)}%) — ${p.explainability}`).join('\n')}`
        : '',
      recentEvidence.length
        ? `RECENT EPISODIC EVIDENCE:\n${recentEvidence.map((e) => `- ${e.placeName} (${e.experienceType}): ${e.rating ? `${e.rating}/5` : e.sentiment}${e.crowdLevel ? `, crowd ${e.crowdLevel}/5` : ''}${e.weatherCondition ? `, weather: ${e.weatherCondition}` : ''}`).join('\n')}`
        : '',
      evolution.length
        ? `TEMPORAL PREFERENCE SHIFTS:\n${evolution.map((ev) => `- ${ev.value}: ${ev.note}`).join('\n')}`
        : '',
      '=== END DEPKG EXPERIENCE CONTEXT ===',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const graphSnapshot = {
    userId,
    updatedAt: new Date().toISOString(),
    knowledgeLayers: {
      facts,
      experiences: experienceNodes,
      preferences: explicitPreferences,
      inferences,
    },
    liked,
    avoided,
    evolution,
    compressedContext,
  };

  // Persist locally so offline & hybrid dev always have the live graph
  localExpStore.saveUserGraph(userId, graphSnapshot);

  // Sync to MongoDB DEPKG collections if connected
  if (isMongoConnected()) {
    try {
      await DEPKGTraveller.findOneAndUpdate(
        { userId },
        {
          $set: {
            displayName: `Traveller_${userId.slice(-6)}`,
            lastConsolidatedAt: new Date(),
          },
          $setOnInsert: { totalTripsCompleted: 0, unconsolidatedTripsCount: 0 },
        },
        { upsert: true }
      );

      for (const pref of [...liked, ...avoided]) {
        await DEPKGPreferenceSnapshot.findOneAndUpdate(
          { travellerId: userId, dimension: pref.dimension, value: pref.value },
          {
            $set: {
              affinity: pref.affinity,
              confidence: pref.confidence,
              status: pref.status === 'like' ? 'like' : pref.status === 'avoid' ? 'avoid' : 'weak',
              positiveWeightedSum: pref.positiveEvidence,
              negativeWeightedSum: pref.negativeEvidence,
              effectiveN: pref.observationCount,
              driftFlag: pref.driftFlag,
              supportingEpisodes: pref.supportingEpisodes.map((e) => e.experienceId),
              contradictingEpisodes: pref.contradictingEpisodes.map((e) => e.experienceId),
              lastConsolidatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
      maybeRunConsolidation(userId).catch(() => {});
    } catch (err) {
      console.warn('[DEPKG Bridge] MongoDB sync skipped:', err.message);
    }
  }

  return graphSnapshot;
}

/**
 * Retrieve structured experience context for AI Trip Planner personalization & explainability
 */
async function getExperienceContextForPlanner(userId) {
  if (!userId || userId === 'anonymous') {
    return null;
  }
  let graph = localExpStore.getUserGraph(userId);
  if (!graph) {
    // Build on-demand if user has experiences not yet materialized
    const exps = localExpStore.getAllByUser(userId);
    if (exps.length > 0 || isMongoConnected()) {
      graph = await rebuildUserDEPKG(userId);
    }
  }
  return graph;
}

module.exports = {
  rebuildUserDEPKG,
  getExperienceContextForPlanner,
};
