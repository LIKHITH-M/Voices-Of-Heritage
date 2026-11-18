/**
 * Structured Experience Knowledge Extractor
 * Converts free-text user feedback + structured signals into normalized DEPKG signals.
 * Preserves original feedback; uses Groq LLM when available with deterministic NLP fallback.
 */

const POSITIVE_PATTERNS = [
  { regex: /\b(architecture|carving|sculpture|pillar|dome|marble|gopuram|fort|palace|monument|ruins|heritage)\b/i, label: 'Architecture', dim: 'interest' },
  { regex: /\b(history|historical|dynasty|empire|ancient|century|inscription|museum|manuscript|archive)\b/i, label: 'History', dim: 'interest' },
  { regex: /\b(peaceful|serene|calm|quiet|tranquil|silent|meditat|spiritual|divine|sacred|zen)\b/i, label: 'Peaceful Environment', dim: 'atmosphere' },
  { regex: /\b(authentic|traditional|local|homemade|original|rustic|heritage cuisine|spice|delicious|tasty)\b/i, label: 'Traditional & Authentic Food', dim: 'cuisine' },
  { regex: /\b(nature|scenic|greenery|river|lake|hill|sunrise|sunset|garden|forest|view|landscape)\b/i, label: 'Nature & Scenic Views', dim: 'interest' },
  { regex: /\b(photo|photography|photogenic|golden hour|picturesque|instagram)\b/i, label: 'Photography', dim: 'interest' },
  { regex: /\b(guide|story|stories|legend|mythology|informative|knowledgeable|narration|audio)\b/i, label: 'Stories & Guided Tours', dim: 'service' },
  { regex: /\b(clean|well[- ]maintained|tidy|hygienic|spotless)\b/i, label: 'Cleanliness', dim: 'quality' },
  { regex: /\b(art|mural|painting|craft|artisan|handloom|music|dance|festival)\b/i, label: 'Art & Culture', dim: 'interest' },
  { regex: /\b(yoga|ayurveda|panchakarma|wellness|retreat|healing|relax)\b/i, label: 'Wellness & Spiritual', dim: 'wellness' },
  { regex: /\b(3d|ar|vr|360|virtual|immersive|interactive)\b/i, label: 'Immersive 3D/AR/VR', dim: 'immersive' },
  { regex: /\b(eco|sustainable|solar|organic|green)\b/i, label: 'Eco-Friendly Stays', dim: 'stay' },
];

const NEGATIVE_PATTERNS = [
  { regex: /\b(crowd|crowded|overcrowded|packed|rush|noisy|chaotic|too many people|long queue|long line)\b/i, label: 'Crowding', dim: 'crowd_level', pref: 'Less crowded places' },
  { regex: /\b(hot|heat|scorching|humid|sweat|sunburn)\b/i, label: 'Extreme Heat', dim: 'weather', pref: 'Morning visits to avoid afternoon heat' },
  { regex: /\b(rain|raining|heavy rain|downpour|monsoon|wet|slippery|storm|flooded)\b/i, label: 'Heavy Rain Impact', dim: 'weather', pref: 'Indoor alternatives during rainy conditions' },
  { regex: /\b(long walk|exhausting|tiring|too much walking|steep|stairs|fatigue|far walk)\b/i, label: 'Long Walking Distance', dim: 'walking', pref: 'Shorter walking distances' },
  { regex: /\b(expensive|overpriced|costly|rip[- ]?off|tourist trap)\b/i, label: 'High Cost', dim: 'budget', pref: 'Lower-cost activities' },
  { regex: /\b(dirty|unclean|litter|trash|unhygienic|smelly)\b/i, label: 'Poor Cleanliness', dim: 'quality', pref: 'Well-maintained sites' },
  { regex: /\b(rushed|too fast|short time|not enough time|hurried)\b/i, label: 'Rushed Schedule', dim: 'pace', pref: 'Longer exploration time' },
  { regex: /\b(wait|waiting|delay|slow entry|ticket queue)\b/i, label: 'Long Waiting Time', dim: 'queue', pref: 'Pre-booked early slots' },
  { regex: /\b(modern version|inauthentic|commercialized|artificial|fake)\b/i, label: 'Commercialized / Inauthentic', dim: 'authenticity', pref: 'Authentic local experiences' },
];

const TEMPORAL_PATTERNS = [
  { regex: /\b(early morning|dawn|sunrise|before 9|6 am|7 am|8 am)\b/i, pref: 'Early morning visits', value: 'early_morning' },
  { regex: /\b(morning|mornings)\b/i, pref: 'Prefer morning visits', value: 'morning' },
  { regex: /\b(avoid afternoon|too hot in afternoon|crowded in the afternoon|afternoon crowd|midday heat)\b/i, pref: 'Avoid afternoon visits', value: 'avoid_afternoon', polarity: 'negative' },
  { regex: /\b(evening|sunset|golden hour|dusk|aarti)\b/i, pref: 'Evening / golden hour visits', value: 'evening' },
  { regex: /\b(weekday|weekdays|avoid weekend|weekend crowd)\b/i, pref: 'Prefer weekday visits', value: 'weekday' },
];

const WEATHER_PATTERNS = [
  { regex: /\b(heavy rain|raining heavily|pouring|downpour|rainstorm)\b/i, condition: 'Heavy rain', impact: 'Outdoor exploration reduced', signal: 'Prefer indoor alternatives during rainy conditions' },
  { regex: /\b(rain|raining|rainy|drizzle|showers)\b/i, condition: 'Rain', impact: 'Weather affected outdoor route', signal: 'Include covered heritage halls or museums on rainy days' },
  { regex: /\b(scorching|extreme heat|very hot|too hot|heatwave|blazing sun)\b/i, condition: 'High heat', impact: 'Midday outdoor fatigue', signal: 'Schedule open-air monuments in early morning and shaded sites at midday' },
  { regex: /\b(fog|foggy|mist|misty|poor visibility)\b/i, condition: 'Fog / low visibility', impact: 'Reduced viewpoint visibility', signal: 'Delay sunrise viewpoints during winter fog' },
];

const POSITIVE_SENTIMENT_WORDS = /\b(love|loved|amazing|beautiful|wonderful|great|awesome|fantastic|excellent|peaceful|authentic|delicious|best|enjoy|enjoyed|liked|recommend|mesmerizing|stunning|breathtaking|serene|memorable|helpful|pleasant)\b/gi;
const NEGATIVE_SENTIMENT_WORDS = /\b(hate|hated|terrible|awful|bad|worst|disappointing|crowded|overcrowded|dirty|rude|boring|expensive|exhausting|couldn't|could not|ruined|horrible|poor|avoid|dislike|disliked|unpleasant|noisy)\b/gi;

function deterministicExtract({ freeText = '', placeName = '', ratings = {}, enjoyedTags = [], dislikedTags = [], nextTimePreferences = [], foodDetails = null, wellnessDetails = null, experienceType = 'place' }) {
  const text = String(freeText || '').trim();
  const positives = new Set();
  const negatives = new Set();
  const temporalPreferences = [];
  const weatherImpacts = [];
  const futurePreferences = new Set(nextTimePreferences || []);
  const foodSignals = [];
  const wellnessSignals = [];

  // 1. Extract from free text using clause awareness
  const clauses = text.split(/(?<=[.!?;])|\b(?:but|however|although|though|yet)\b/i).map((c) => c.trim()).filter(Boolean);

  for (const clause of clauses) {
    const isNegated = /\b(not|no|never|dislike|disliked|avoid|hate|hated|too|extremely|very bad|couldn't|could not|ruined)\b/i.test(clause);

    for (const p of POSITIVE_PATTERNS) {
      if (p.regex.test(clause)) {
        if (!isNegated) {
          positives.add(p.label);
        }
      }
    }

    for (const n of NEGATIVE_PATTERNS) {
      if (n.regex.test(clause)) {
        negatives.add(n.label);
        if (n.pref) futurePreferences.add(n.pref);
      }
    }
  }

  // 2. Temporal extraction
  for (const t of TEMPORAL_PATTERNS) {
    if (t.regex.test(text)) {
      if (!temporalPreferences.some((x) => x.value === t.value)) {
        temporalPreferences.push({
          label: t.pref,
          value: t.value,
          polarity: t.polarity || 'positive',
          explicit: true,
        });
      }
      futurePreferences.add(t.pref);
    }
  }

  // 3. Weather impact extraction
  for (const w of WEATHER_PATTERNS) {
    if (w.regex.test(text)) {
      if (!weatherImpacts.some((x) => x.condition === w.condition)) {
        weatherImpacts.push({
          location: placeName || 'Visited location',
          weather: w.condition,
          impact: w.impact,
          futureSignal: w.signal,
        });
        futurePreferences.add(w.signal);
      }
    }
  }

  // 4. Fold in structured tags
  (enjoyedTags || []).forEach((t) => positives.add(t));
  (dislikedTags || []).forEach((t) => negatives.add(t));

  // 5. Food heritage signals
  if (experienceType === 'food' || (foodDetails && (foodDetails.dish || foodDetails.cuisine))) {
    const r = Number(ratings?.overall || ratings?.taste || 0);
    if (foodDetails?.dish) {
      foodSignals.push({
        relation: r >= 4 ? 'likes' : r > 0 && r <= 2 ? 'dislikes' : 'tried',
        target: foodDetails.dish,
        region: foodDetails.region || '',
        cuisine: foodDetails.cuisine || '',
      });
    }
    if (foodDetails?.cuisine && r >= 4) {
      foodSignals.push({ relation: 'enjoyed', target: `${foodDetails.cuisine} cuisine`, region: foodDetails.region || '' });
    }
    if (/traditional|authentic/i.test(text) || Number(ratings?.authenticity || 0) >= 4) {
      positives.add('Traditional & Authentic Food');
      futurePreferences.add('More authentic local food');
    }
  }

  // 6. Wellness / Spiritual signals
  if (experienceType === 'wellness' || (wellnessDetails && wellnessDetails.experienceSubType)) {
    const r = Number(ratings?.overall || 0);
    if (Number(ratings?.peacefulness || 0) >= 4) {
      positives.add('Peaceful Environment');
      wellnessSignals.push({ relation: 'prefers', target: 'Peaceful places' });
    }
    if (Number(ratings?.crowdLevel || 0) > 0 && Number(ratings?.crowdLevel) <= 2 && r >= 4) {
      wellnessSignals.push({ relation: 'prefers', target: 'Low-crowd experiences' });
    }
    if (wellnessDetails?.preferredTime) {
      temporalPreferences.push({
        label: `Prefer ${wellnessDetails.preferredTime.toLowerCase()} spiritual activities`,
        value: wellnessDetails.preferredTime.toLowerCase().replace(/\s+/g, '_'),
        polarity: 'positive',
        explicit: true,
      });
    }
  }

  // 7. Sentiment & Confidence
  const posMatches = (text.match(POSITIVE_SENTIMENT_WORDS) || []).length + positives.size;
  const negMatches = (text.match(NEGATIVE_SENTIMENT_WORDS) || []).length + negatives.size;
  const overallRating = Number(ratings?.overall || 0);

  let sentiment = 'neutral';
  let sentimentScore = 0;

  if (overallRating >= 4) {
    sentiment = negMatches >= 2 && posMatches >= 1 ? 'mixed' : 'positive';
    sentimentScore = negMatches >= 2 ? 0.45 : 0.85;
  } else if (overallRating > 0 && overallRating <= 2) {
    sentiment = 'negative';
    sentimentScore = -0.8;
  } else if (posMatches > 0 && negMatches > 0) {
    sentiment = posMatches >= negMatches ? 'positive' : 'mixed';
    sentimentScore = (posMatches - negMatches) / Math.max(1, posMatches + negMatches);
  } else if (posMatches > 0) {
    sentiment = 'positive';
    sentimentScore = 0.75;
  } else if (negMatches > 0) {
    sentiment = 'negative';
    sentimentScore = -0.7;
  }

  // Confidence reflects richness of explicit signals
  const signalCount =
    positives.size +
    negatives.size +
    temporalPreferences.length +
    weatherImpacts.length +
    (overallRating > 0 ? 1 : 0) +
    (text.length > 25 ? 1 : 0);
  const confidence = Number(Math.min(0.95, Math.max(0.35, 0.35 + signalCount * 0.1)).toFixed(2));
  const confidenceLabel = confidence >= 0.75 ? 'High' : confidence >= 0.55 ? 'Medium' : 'Low';

  return {
    place: placeName || 'General Experience',
    positives: Array.from(positives),
    negatives: Array.from(negatives),
    temporalPreferences,
    weatherImpacts,
    foodSignals,
    wellnessSignals,
    futurePreferences: Array.from(futurePreferences),
    sentiment,
    sentimentScore: Number(sentimentScore.toFixed(2)),
    confidence,
    confidenceLabel,
    extractionMethod: 'structured-nlp',
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Main extraction entry point: runs fast deterministic extraction,
 * optionally enriches with Groq LLM if GROQ_API_KEY is configured and text is rich.
 */
async function extractExperienceKnowledge(input = {}) {
  const base = deterministicExtract(input);
  const text = String(input.freeText || '').trim();

  if (text.length >= 25 && process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_')) {
    try {
      const Groq = require('groq-sdk');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 4500 });
      const prompt = `Extract structured travel knowledge from this heritage traveller feedback.
Place: ${input.placeName || 'Unknown'}
Rating: ${input.ratings?.overall || 'N/A'}/5
Feedback: "${text}"

Return ONLY valid JSON with keys:
{"positives":[],"negatives":[],"temporalPreferences":[],"weatherImpacts":[],"futurePreferences":[],"sentiment":"positive|mixed|neutral|negative","confidence":0.85}`;

      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 280,
      });

      const raw = completion.choices?.[0]?.message?.content;
      if (raw) {
        const llm = JSON.parse(raw);
        return {
          ...base,
          positives: Array.from(new Set([...base.positives, ...(llm.positives || [])])),
          negatives: Array.from(new Set([...base.negatives, ...(llm.negatives || [])])),
          futurePreferences: Array.from(new Set([...base.futurePreferences, ...(llm.futurePreferences || [])])),
          sentiment: ['positive', 'mixed', 'neutral', 'negative'].includes(llm.sentiment) ? llm.sentiment : base.sentiment,
          confidence: typeof llm.confidence === 'number' ? Math.max(base.confidence, Math.min(0.98, llm.confidence)) : base.confidence,
          extractionMethod: 'groq-llm+nlp',
        };
      }
    } catch (err) {
      // Silently keep deterministic extraction when offline
    }
  }

  return base;
}

module.exports = {
  extractExperienceKnowledge,
  deterministicExtract,
};
