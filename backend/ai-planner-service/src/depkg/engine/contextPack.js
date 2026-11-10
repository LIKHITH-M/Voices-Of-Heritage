const mongoose = require('mongoose');
const { DEPKGTraveller, DEPKGPreferenceSnapshot, DEPKGEpisode, HeritageSite } = require('../models/depkgModels');
const { parseDestinationScope } = require('../../services/heritageKnowledge');
const config = require('../config/default');

const REGION_MAP = { hampi:'Karnataka',mysore:'Karnataka',belur:'Karnataka',halebidu:'Karnataka',badami:'Karnataka',pattadakal:'Karnataka',aihole:'Karnataka',bangalore:'Karnataka',bengaluru:'Karnataka',thanjavur:'Tamil Nadu',madurai:'Tamil Nadu',mahabalipuram:'Tamil Nadu',mamallapuram:'Tamil Nadu',chennai:'Tamil Nadu',kanchipuram:'Tamil Nadu',jaipur:'Rajasthan',jodhpur:'Rajasthan',jaisalmer:'Rajasthan',udaipur:'Rajasthan',pushkar:'Rajasthan',agra:'Uttar Pradesh','fatehpur sikri':'Uttar Pradesh',varanasi:'Uttar Pradesh',lucknow:'Uttar Pradesh',delhi:'Delhi','new delhi':'Delhi',aurangabad:'Maharashtra',ajanta:'Maharashtra',ellora:'Maharashtra',pune:'Maharashtra',mumbai:'Maharashtra',goa:'Goa',patan:'Gujarat',modhera:'Gujarat',ahmedabad:'Gujarat',konark:'Odisha',puri:'Odisha',bhubaneswar:'Odisha',spiti:'Himachal Pradesh',manali:'Himachal Pradesh',bishnupur:'West Bengal',kolkata:'West Bengal',kochi:'Kerala',thiruvananthapuram:'Kerala' };
const REGION_NEARBY = { Karnataka:['Karnataka'], 'Tamil Nadu':['Tamil Nadu'], Rajasthan:['Rajasthan'], 'Uttar Pradesh':['Uttar Pradesh'], Delhi:['Delhi'], Maharashtra:['Maharashtra'], Gujarat:['Gujarat'], Goa:['Goa'], Odisha:['Odisha'], 'Himachal Pradesh':['Himachal Pradesh'], 'West Bengal':['West Bengal'], Kerala:['Kerala'] };

function inferRegion(dest){ if(!dest)return null; const d=dest.toLowerCase(); for(const[k,v]of Object.entries(REGION_MAP)){if(d.includes(k))return v;} return null; }

async function buildContextPack(travellerId, { destination, region, duration, interests, groupSize, includePersonalization = true }){
  const targetRegion = region || inferRegion(destination);
  let candidateSites = [];
  let likedPrefs = [], avoidedPrefs = [], totalTrips = 0, unconsolidated = 0;

  // Query MongoDB ONLY if connected to prevent 10s buffering timeouts
  if (mongoose.connection.readyState === 1) {
    try {
      const candidateQuery = { isActive: true };
      if (targetRegion) {
        const regions = REGION_NEARBY[targetRegion] || [targetRegion];
        candidateQuery.region = { $in: regions };
      }
      candidateSites = await HeritageSite.find(candidateQuery).limit(config.CONTEXT_MAX_CANDIDATES).lean();
      if (includePersonalization) {
        const traveller = await DEPKGTraveller.findOne({ userId: travellerId }).lean();
        if (traveller) {
          const prefs = await DEPKGPreferenceSnapshot.find({ travellerId, status: { $in: ['like', 'avoid'] } })
            .sort({ confidence: -1 })
            .limit(config.CONTEXT_TOP_K_PREFS * 2)
            .lean();
          likedPrefs = prefs.filter(p => p.status === 'like').slice(0, config.CONTEXT_TOP_K_PREFS);
          avoidedPrefs = prefs.filter(p => p.status === 'avoid').slice(0, 5);
          totalTrips = traveller.totalTripsCompleted || 0;
          unconsolidated = traveller.unconsolidatedTripsCount || 0;
        }
      }
    } catch (dbErr) {
      console.warn('[contextPack] MongoDB query warning:', dbErr.message);
    }
  }

  // Resilient fallback from authoritative heritageKnowledge
  if (candidateSites.length === 0) {
    const matchingHubs = parseDestinationScope(destination);
    candidateSites = matchingHubs.flatMap(hub => (hub.subSites || []).map(s => ({
      siteId: s.siteId,
      name: s.name,
      region: hub.region,
      district: hub.district,
      archStyle: hub.archStyle,
      period: [hub.dynasty],
      dynasty: [hub.dynasty],
      siteCategory: s.category,
      knownFor: [s.preferenceMatchTag || s.name],
      unescoStatus: hub.name.includes('UNESCO') ? 'world_heritage' : 'none',
      entryFeeINR: s.entryFeeINR || 0,
      avgVisitDurationHours: s.duration || 2,
      bestTimeToVisit: 'Oct – Mar',
      commonActivities: [s.name],
      localCuisine: hub.cuisines || [],
      coordinates: s.coordinates || hub.coordinates,
      nearbySites: [],
    })));
  }

  const hasPersonalizationData = !!(likedPrefs.length || avoidedPrefs.length);
  return {
    metadata: {
      travellerId,
      generatedAt: new Date().toISOString(),
      destination: destination || region,
      targetRegion,
      hasPersonalizationData,
      totalTripsInHistory: totalTrips,
      tripsSinceConsolidation: unconsolidated,
      isColdStart: !hasPersonalizationData,
    },
    candidateSites,
    travelerPreferences: {
      liked: likedPrefs,
      avoided: avoidedPrefs,
      driftWarnings: [],
    },
    planningContext: { duration, groupSize: groupSize || 1, requestedInterests: interests || [] },
  };
}
module.exports = { buildContextPack };
