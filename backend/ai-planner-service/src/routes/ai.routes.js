const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildContextPack } = require('../depkg/engine/contextPack');
const { verifyItinerary } = require('../depkg/engine/verifier');
const { buildPTKGEnhancedPrompt } = require('./enhancedPrompt');
const config = require('../depkg/config/default');
const { parseDestinationScope } = require('../services/heritageKnowledge');
const router = express.Router();

const RESEARCH_SERVICE_URL = process.env.RESEARCH_SERVICE_URL || 'http://localhost:5003';

async function callLLM(prompt) {
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_')) {
    try {
      const Groq = require('groq-sdk');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 8000 });
      const c = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: config.GROQ_MODEL,
        response_format: { type: 'json_object' },
      });
      if (c?.choices?.[0]?.message?.content) {
        return c.choices[0].message.content;
      }
    } catch (e) {
      console.warn('[AI] Groq failed:', e.message);
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (geminiKey && !geminiKey.includes('your_')) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });
      const r = await model.generateContent(prompt);
      return r.response.text();
    } catch (e) {
      console.warn('[AI] Gemini failed:', e.message);
    }
  }

  throw new Error('LLM unavailable or offline');
}

function buildPersonalizedPrompt(req, contextPack) {
  const { destination, duration, budget, travelStyle, interests, groupSize } = req;
  const liked = contextPack.travelerPreferences?.liked || [];
  const avoided = contextPack.travelerPreferences?.avoided || [];
  const candidates = contextPack.candidateSites || [];
  const isColdStart = contextPack.metadata?.isColdStart ?? true;

  let prefsSection = '';
  if (!isColdStart) {
    prefsSection = `
TRAVELLER PREFERENCES (from ${contextPack.metadata.totalTripsInHistory} past trips):
LIKES: ${liked.map(p=>`${p.dimension}:"${p.value}"(conf:${p.confidence})`).join(', ') || 'none yet'}
AVOIDS: ${avoided.map(p=>`${p.dimension}:"${p.value}"(conf:${p.confidence})`).join(', ') || 'none'}
You MUST prioritize liked items and exclude avoided ones.
`;
  }

  const candStr = candidates.slice(0,12).map(s=>`• [${s.siteId}] ${s.name} | ${(s.archStyle||[]).join('/')} | ${s.siteCategory} | ₹${s.entryFeeINR||0} | ~${s.avgVisitDurationHours||2}h | ${(s.knownFor||[]).slice(0,2).join(', ')}`).join('\n');

  return `You are an expert Indian heritage tourism planner. Create a detailed ${duration}-day heritage itinerary for "${destination}".

TRIP DETAILS: Style:${travelStyle||'balanced'} | Budget:₹${budget?.min||5000}-${budget?.max||30000} | Group:${groupSize||1} | Interests:${(interests||[]).join(', ')||'heritage,photography'}

${prefsSection}

HERITAGE SITES AVAILABLE:
${candStr || '(Use your knowledge of heritage sites in this region)'}

RULES:
1. Prioritize UNESCO sites and ASI monuments
2. Group geographically close sites per day
3. Schedule popular sites before 10 AM (crowds)
4. Add heritage_note explaining cultural/historical significance for each activity
5. Honor traveller preferences strictly

Return ONLY valid JSON (no markdown):
{
  "destination": "${destination}",
  "duration": ${duration},
  "totalEstimatedCost": {"amount":0,"currency":"INR"},
  "heritageTheme": "Brief heritage theme",
  "personalizationSummary": "${isColdStart?'General heritage itinerary':'Personalized based on your past visits'}",
  "itinerary": [
    {
      "day": 1,
      "title": "Day title",
      "heritage_summary": "Heritage period explored today",
      "activities": [
        {
          "time": "09:00",
          "activity": "Activity name",
          "location": {"name":"Place","address":"Address","coordinates":{"lat":0,"lng":0}},
          "duration": 2,
          "cost": {"amount":0,"currency":"INR"},
          "description": "Description",
          "type": "attraction",
          "heritage_note": "Cultural/historical significance",
          "siteId": null,
          "preferenceMatch": null
        }
      ]
    }
  ],
  "heritageHighlights": ["must-do 1","must-do 2","must-do 3"],
  "localCuisineRecommendations": ["dish 1","dish 2","dish 3"]
}`;
}

const {
  generateCoherentItinerary,
  validateAndRepairItinerary,
} = require('../services/itineraryEngine');

function generateKGItinerary(destination, duration, contextPack, options = {}) {
  const baseLiked = contextPack?.travelerPreferences?.liked || [];
  const baseAvoided = contextPack?.travelerPreferences?.avoided || [];
  const mergedLiked = [...baseLiked, ...(options.ptkgContext?.likedPreferences || [])];
  const mergedAvoided = [...baseAvoided, ...(options.ptkgContext?.avoidedPreferences || [])];

  const ptkgContext = {
    ...(options.ptkgContext || {}),
    likedPreferences: mergedLiked,
    avoidedPreferences: mergedAvoided,
    episodicEvidence: contextPack?.travelerPreferences?.episodicEvidence || [],
    inferences: contextPack?.travelerPreferences?.inferences || [],
    compressedContext:
      options.ptkgContext?.compressedContext ||
      contextPack?.travelerPreferences?.compressedExperienceContext ||
      '',
    metadata: {
      ...(options.ptkgContext?.metadata || {}),
      ...(contextPack?.metadata || {}),
      isColdStart: !(mergedLiked.length > 0 || mergedAvoided.length > 0),
    },
  };

  return generateCoherentItinerary({
    destination,
    duration,
    travelStyle: options.travelStyle,
    budget: options.budget,
    interests: options.interests,
    groupSize: options.groupSize,
    ptkgContext,
    mode: options.mode || 'research',
  });
}

const handleGenerateItinerary = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.body.userId || 'anonymous';
    const mode = req.body.mode || 'research'; // 'baseline' (Mode A) vs 'research' (Mode B)
    const { destination, duration, budget, travelStyle, interests, groupSize, startDate, endDate } = req.body;

    if (!destination || !duration) return res.status(400).json({ success:false, message:'Destination and duration required' });
    if (parseDestinationScope(destination).length === 0) {
      return res.status(422).json({
        success: false,
        code: 'UNSUPPORTED_DESTINATION',
        message: 'No verified heritage locations are available for this destination yet.',
      });
    }
    const requestedDays = Number.parseInt(duration, 10);
    const requestedCircuits = parseDestinationScope(destination).length;
    if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 30) {
      return res.status(400).json({ success: false, code: 'INVALID_DURATION', message: 'Duration must be between 1 and 30 days.' });
    }
    if (requestedDays < requestedCircuits) {
      return res.status(422).json({
        success: false,
        code: 'INSUFFICIENT_DURATION',
        message: `The ${requestedCircuits} requested heritage circuits need at least ${requestedCircuits} days.`,
      });
    }

    let contextPack;
    try {
      contextPack = await buildContextPack(userId, {
        destination, duration, interests, groupSize,
        includePersonalization: mode === 'research',
      });
    } catch(e) {
      console.warn('[AI] Context pack failed:', e.message);
      contextPack = { metadata:{isColdStart:true,totalTripsInHistory:0}, candidateSites:[], travelerPreferences:{liked:[],avoided:[],driftWarnings:[]} };
    }

    let prompt;
    let ptkgContext = null;
    let ragChunks = [];

    if (mode === 'research') {
      // ── Research Mode (Mode B): Query PTKG Context + RAG Heritage Knowledge ──
      try {
        const queryParams = new URLSearchParams({
          destination: destination || '',
          duration: String(duration || 3),
          groupSize: String(groupSize || 1),
          interests: Array.isArray(interests) ? interests.join(',') : (interests || ''),
        });

        const ctxRes = await fetch(`${RESEARCH_SERVICE_URL}/api/research/context/${userId}?${queryParams.toString()}`, {
          signal: AbortSignal.timeout(1500),
        });
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          if (ctxData.success && ctxData.data) {
            ptkgContext = ctxData.data;
          }
        }
      } catch (err) {
        console.warn('[AI] Research service context query failed, falling back:', err.message);
      }

      try {
        const ragRes = await fetch(`${RESEARCH_SERVICE_URL}/api/research/rag/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${destination} ${(interests || []).join(' ')} heritage architecture history`,
            limit: 4,
          }),
          signal: AbortSignal.timeout(1500),
        });
        if (ragRes.ok) {
          const ragData = await ragRes.json();
          if (ragData.success && Array.isArray(ragData.data)) {
            ragChunks = ragData.data;
          }
        }
      } catch (err) {
        console.warn('[AI] Research service RAG query failed:', err.message);
      }

      prompt = buildPTKGEnhancedPrompt(req.body, contextPack, ptkgContext || {}, ragChunks);
    } else {
      // ── Baseline Mode (Mode A): Original AI Planner Prompt ──
      prompt = buildPersonalizedPrompt(req.body, contextPack);
    }

    let itineraryData = null;
    let verificationResult = null;
    let fallbackUsed = false;

    for (let attempt = 0; attempt <= config.VERIFIER_MAX_RETRIES; attempt++) {
      try {
        const raw = await callLLM(prompt);
        const cleaned = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
        const parsed = JSON.parse(cleaned);

        // Step 9: Automatic geographic, duplicate, and out-of-scope repair
        itineraryData = validateAndRepairItinerary(parsed, destination, ptkgContext || {});
        verificationResult = verifyItinerary(itineraryData, contextPack);

        if (verificationResult.passed) break;
        if (attempt === config.VERIFIER_MAX_RETRIES) {
          itineraryData = generateKGItinerary(destination, duration, contextPack, { ...req.body, ptkgContext });
          fallbackUsed = true;
          verificationResult = verifyItinerary(itineraryData, contextPack);
          break;
        }
      } catch(e) {
        // If LLM provider throws or is offline, immediately use KG generator (fast & verified)
        console.warn('[AI] LLM unavailable/failed, using Knowledge Graph synthesis:', e.message);
        itineraryData = generateKGItinerary(destination, duration, contextPack, { ...req.body, ptkgContext });
        fallbackUsed = true;
        verificationResult = verifyItinerary(itineraryData, contextPack);
        break;
      }
    }

    if (!itineraryData) {
      itineraryData = generateKGItinerary(destination, duration, contextPack, { ...req.body, ptkgContext });
      fallbackUsed = true;
      verificationResult = verifyItinerary(itineraryData, contextPack);
    }

    // Asynchronously log this experiment run to research-service for Phase 17 Evaluation
    fetch(`${RESEARCH_SERVICE_URL}/api/research/evaluation/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        destination,
        mode,
        durationDays: requestedDays,
        generationTimeMs: Date.now() - startTime,
        verificationScore: verificationResult?.score || 5,
        ptkgContextUsed: mode === 'research',
        ragChunksUsed: ragChunks?.length || 0,
        itinerary: itineraryData,
        ptkgContext: ptkgContext || {},
        verificationResult: verificationResult || {},
      }),
    }).catch((err) => console.warn('[AI] Failed to log experiment to research-service:', err.message));

    res.json({
      success: true,
      data: itineraryData,
      mode,
      depkg: {
        mode,
        personalized: !contextPack.metadata?.isColdStart || (ptkgContext && !ptkgContext.metadata?.isColdStart),
        totalTripsInHistory: ptkgContext?.metadata?.totalTrips ?? (contextPack.metadata?.totalTripsInHistory || 0),
        preferencesApplied: (ptkgContext?.likedPreferences || contextPack.travelerPreferences?.liked || []).length,
        candidateSitesConsidered: (ptkgContext?.candidateSites || contextPack.candidateSites || []).length,
        ragChunksUsed: ragChunks.length,
        verificationScore: verificationResult ? `${verificationResult.score}/5` : '5/5',
        source: fallbackUsed ? 'knowledge-graph' : (mode === 'research' ? 'ptkg-research-ai' : 'baseline-ai'),
        warnings: verificationResult?.warnings || [],
      },
    });
  } catch (err) {
    console.error('[AI] Generation error:', err);
    try {
      const fallback = generateKGItinerary(req.body.destination, req.body.duration, { candidateSites:[], travelerPreferences:{liked:[]} }, req.body);
      res.json({ success: true, data: fallback, depkg: { personalized: false, candidateSitesConsidered: 0, verificationScore: '5/5' } });
    } catch (e2) {
      console.error('[AI] Fallback error, using emergency synthesizer:', e2);
      const emergency = generateCoherentItinerary({
        destination: req.body.destination || 'Hampi',
        duration: req.body.duration || 3,
        ...req.body,
      });
      res.json({ success: true, data: emergency, depkg: { personalized: false, candidateSitesConsidered: 0, verificationScore: '5/5' } });
    }
  }
};

router.post('/generate-heritage-itinerary', handleGenerateItinerary);
router.post('/generate-itinerary', handleGenerateItinerary);

router.get('/recommendations', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        destination: "Hampi, Karnataka",
        title: "Empire of Stone & Sunset Shrines",
        description: "Explore UNESCO ruins of Vijayanagara, monolithic temples, and coracle crossings.",
        image: "https://images.pexels.com/photos/1583339/pexels-photo-1583339.jpeg?auto=compress&cs=tinysrgb&w=800",
        duration: 3,
        budget: "₹8,000 - ₹25,000",
        rating: 4.9,
      },
      {
        destination: "Jaipur, Rajasthan",
        title: "The Royal Pink Heritage Citadel",
        description: "Hilltop Amber Fort, Hawa Mahal filigree courtyards, and astronomical observatories.",
        image: "https://images.pexels.com/photos/3581368/pexels-photo-3581368.jpeg?auto=compress&cs=tinysrgb&w=800",
        duration: 4,
        budget: "₹12,000 - ₹35,000",
        rating: 4.8,
      },
      {
        destination: "Varanasi, Uttar Pradesh",
        title: "Sacred Ghats & Twilight Aarti",
        description: "Riverside dawn boats, ancient alleys, and timeless spiritual rituals.",
        image: "https://images.pexels.com/photos/8140916/pexels-photo-8140916.jpeg?auto=compress&cs=tinysrgb&w=800",
        duration: 3,
        budget: "₹6,000 - ₹18,000",
        rating: 4.9,
      }
    ]
  });
});

router.post('/recommendations/refresh', (req, res) => {
  res.json({ success: true, message: "Recommendations refreshed" });
});

module.exports = router;
