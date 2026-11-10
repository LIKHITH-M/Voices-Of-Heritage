const config = require('../config/default');
function computeSignedScore(r){ return (r - config.SAT_MIDPOINT) / config.SAT_SCALE; }
function crowdLabel(n){ return n<=2?'low':n===3?'mid':'high'; }
function computeWeight(tripIndex,tNow,H=config.HALF_LIFE_TRIPS){ return (!isFinite(H)||H<=0)?1.0:Math.pow(0.5,(tNow-tripIndex)/H); }
function extractObservations(episode,tripIndex){
  const s=computeSignedScore(episode.satisfactionRating),eId=episode._id?.toString()||episode.id,base={signedScore:s,tripIndex,episodeId:eId},obs=[],a=episode.siteAttributes||{},c=episode.visitContext||{};
  (a.archStyle||[]).forEach(v=>v&&obs.push({dimension:'arch_style',value:v.trim(),...base}));
  (a.period||[]).forEach(v=>v&&obs.push({dimension:'period',value:v.trim(),...base}));
  (a.dynasty||[]).forEach(v=>v&&obs.push({dimension:'dynasty',value:v.trim(),...base}));
  if(a.siteCategory)obs.push({dimension:'site_category',value:a.siteCategory.trim(),...base});
  if(a.region)obs.push({dimension:'heritage_region',value:a.region.trim(),...base});
  (a.cuisine||[]).forEach(v=>v&&obs.push({dimension:'cuisine',value:v.trim(),...base}));
  if(c.timeOfDay)obs.push({dimension:'time_of_day',value:c.timeOfDay,...base});
  if(c.crowdCount!=null)obs.push({dimension:'crowd_level',value:crowdLabel(c.crowdCount),...base});
  if(c.transportMode)obs.push({dimension:'transport_mode',value:c.transportMode.trim(),...base});
  (episode.activities||[]).forEach(v=>v&&obs.push({dimension:'activity',value:v.trim(),...base}));
  return obs;
}
function computeAffinityAndConfidence(observations,tNow,opts={}){
  const kappa=opts.kappa??config.KAPPA,tau=opts.tau??config.AFFINITY_THRESHOLD,cMin=opts.cMin??config.CONFIDENCE_MIN,epsilon=opts.epsilon??config.EVIDENCE_EPSILON,nMin=opts.nMin??config.N_MIN,H=opts.halfLife??config.HALF_LIFE_TRIPS;
  let sPlus=0,sMinus=0,nEff=0;
  const wObs=observations.map(o=>({...o,weight:computeWeight(o.tripIndex,tNow,H)}));
  wObs.forEach(({signedScore:s,weight:w})=>{sPlus+=w*Math.max(s,0);sMinus+=w*Math.max(-s,0);nEff+=w;});
  if(nEff<epsilon)return{affinity:0,confidence:0,status:'retired',positiveSum:sPlus,negativeSum:sMinus,effectiveN:nEff,weightedObservations:wObs};
  const affinity=(sPlus-sMinus)/(nEff+kappa),confidence=Math.abs(affinity)*Math.min(1,nEff/nMin);
  const status=affinity>=tau&&confidence>=cMin?'like':affinity<=-tau&&confidence>=cMin?'avoid':'weak';
  return{affinity,confidence,status,positiveSum:sPlus,negativeSum:sMinus,effectiveN:nEff,weightedObservations:wObs};
}
function detectDrift(observations,tNow,opts={}){
  const R=opts.driftRecentWindow??config.DRIFT_RECENT_WINDOW,dMin=opts.driftMinN??config.DRIFT_MIN_N,delta=opts.driftMinDelta??config.DRIFT_MIN_DELTA,H=opts.halfLife??config.HALF_LIFE_TRIPS,kappa=opts.kappa??config.KAPPA;
  const recent=observations.filter(o=>o.tripIndex>=tNow-R+1),older=observations.filter(o=>o.tripIndex<tNow-R+1);
  const wa=set=>{if(!set.length)return null;let s=0,m=0,n=0;set.forEach(o=>{const w=computeWeight(o.tripIndex,tNow,H);s+=w*Math.max(o.signedScore,0);m+=w*Math.max(-o.signedScore,0);n+=w;});return n<dMin?null:(s-m)/(n+kappa);};
  const rA=wa(recent),oA=wa(older);
  if(rA===null||oA===null)return{driftFlag:false,recentAffinity:rA,olderAffinity:oA};
  return{driftFlag:Math.sign(rA)!==Math.sign(oA)||Math.abs(rA-oA)>=delta,recentAffinity:rA,olderAffinity:oA};
}
function groupObservationsByKey(all){const g=new Map();all.forEach(o=>{const k=`${o.dimension}::${o.value}`;if(!g.has(k))g.set(k,[]);g.get(k).push(o);});return g;}
function parseGroupKey(k){const i=k.indexOf('::');return{dimension:k.substring(0,i),value:k.substring(i+2)};}
function computePreferenceUpdates(episodes,opts={}){
  if(!episodes||!episodes.length)return[];
  const tNow=Math.max(...episodes.map(e=>e.tripIndex));
  const all=[];episodes.forEach(e=>all.push(...extractObservations(e,e.tripIndex)));
  if(!all.length)return[];
  const groups=groupObservationsByKey(all);
  const updates=[];
  for(const[key,obs]of groups){
    const{dimension,value}=parseGroupKey(key);
    const m=computeAffinityAndConfidence(obs,tNow,opts);
    const d=detectDrift(obs,tNow,opts);
    const sIds=[],cIds=[];
    (m.weightedObservations||[]).forEach(w=>{const id=w.episodeId;if((w.signedScore>=0&&m.affinity>=0)||(w.signedScore<0&&m.affinity<0)){if(!sIds.includes(id))sIds.push(id);}else{if(!cIds.includes(id))cIds.push(id);}});
    updates.push({dimension,value,affinity:m.affinity,confidence:m.confidence,status:m.status,positiveWeightedSum:m.positiveSum,negativeWeightedSum:m.negativeSum,effectiveN:m.effectiveN,driftFlag:d.driftFlag,recentAffinity:d.recentAffinity,olderAffinity:d.olderAffinity,supportingEpisodeIds:sIds,contradictingEpisodeIds:cIds,mostRecentTripIndex:Math.max(...obs.map(o=>o.tripIndex)),observationCount:obs.length});
  }
  return updates;
}
module.exports={computeSignedScore,crowdLabel,extractObservations,computeWeight,computeAffinityAndConfidence,detectDrift,groupObservationsByKey,parseGroupKey,computePreferenceUpdates};
