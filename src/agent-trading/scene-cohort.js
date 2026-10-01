import {canonicalChain,numericField,tokenKey} from './token-selection.js';
import {sourceAge,tokenEligibility,TOKEN_ACTIVITY_POLICY} from './token-eligibility.js';
export {sourceAge} from './token-eligibility.js';
// A delayed capture remains a view of its original observation time. Its
// timestamp and stale status stay visible; wall-clock expiry must not erase it.
export function captureSceneClock(capture,now=Date.now()){
 const received=Date.parse(capture?.receivedAt??'');
 const stale=Number.isFinite(received)&&now-received>TOKEN_ACTIVITY_POLICY.freshMs;
 return {stale,now:stale?received:now};
}
export function activeRanking(token,now=Date.now()){
 const r=token.ranking,age=now-Date.parse(r?.receivedAt);
 return !!r&&r.window==='5m'&&Number.isFinite(age)&&age>=-2000&&age<=45000&&r.swaps>0&&r.volume>0&&r.liquidity>0;
}
// Global quality controls admission; display modes never erase valid history.
// Retention is scoped to one viewer, bounded by its roster and original evidence.
export function createSceneCohortState(){return {retained:new Map(),seeded:false};}
export function tokenObservationClock(token,now=Date.now()){
 const asOf=Date.parse(token.evidence?.receivedAt??''),age=now-asOf;
 return {asOf:Number.isFinite(asOf)?asOf:null,stale:!Number.isFinite(age)||age<-2000||age>TOKEN_ACTIVITY_POLICY.freshMs};
}
const observationKey=token=>JSON.stringify([token.evidence?.captureId,token.evidence?.captureHash,token.evidence?.receivedAt,token.ranking?.captureId,token.ranking?.captureHash,token.ranking?.receivedAt]);
// Only the first already-verified bootstrap may seed a historical visual roster.
// This never supplies fresh arrival eligibility or changes source timestamps.
export function seedHistoricalSceneCohortState(tokens,options={}){
 const {state}=options,now=options.now??Date.now();if(!state||state.seeded)return 0;state.seeded=true;
 let count=0;
 for(const token of tokens){
  const clock=tokenObservationClock(token,now),evidence=token.evidence,ranked=Date.parse(token.ranking?.receivedAt??'');
  if(clock.asOf===null||clock.asOf>now||!evidence?.captureId?.trim()||!/^[a-f0-9]{64}$/i.test(evidence.captureHash??'')||Number.isFinite(ranked)&&ranked>clock.asOf)continue;
  const firstSeen=Date.parse(token.firstSeenAt??''),lifecycleAt=Number.isFinite(firstSeen)&&firstSeen<=now?Math.max(clock.asOf,firstSeen):clock.asOf;
  if(!sceneCohort([token],{quality:true,view:'global',now:lifecycleAt,observationNow:clock.asOf}).length)continue;
  state.retained.set(tokenKey(token),{observationKey:observationKey(token),asOf:clock.asOf,lifecycleAt});count++;
 }
 return count;
}
export function persistentSceneCohort(tokens,options={}){
 const now=options.now??Date.now(),state=options.state,policy={...options,quality:true},keys=new Set(tokens.map(tokenKey));
 if(state)for(const key of state.retained.keys())if(!keys.has(key))state.retained.delete(key);
 return tokens.filter(token=>{
  const key=tokenKey(token),identity=observationKey(token),clock=tokenObservationClock(token,now),previous=state?.retained.get(key);
  if(!clock.stale){
   const eligible=sceneCohort([token],{quality:true,view:'global',now}).length>0;
   if(state){
    if(!eligible)state.retained.delete(key);
    else if(previous?.observationKey!==identity){
     const firstSeen=Date.parse(token.firstSeenAt??'');
     state.retained.set(key,{observationKey:identity,asOf:clock.asOf,lifecycleAt:Number.isFinite(firstSeen)?Math.max(clock.asOf,Math.min(firstSeen,now)):clock.asOf});
    }
   }
   return eligible&&sceneCohort([token],{...policy,now}).length>0;
  }
  if(!previous||previous.observationKey!==identity){state?.retained.delete(key);return false;}
  if(!sceneCohort([token],{quality:true,view:'global',now:previous.lifecycleAt,observationNow:previous.asOf}).length){state.retained.delete(key);return false;}
  return sceneCohort([token],{...policy,now:previous.lifecycleAt,observationNow:previous.asOf}).length>0;
 }).sort(cohortOrder(options.view??'global',now));
}
// A delayed combined capture must not override another chain's current source.
export function networkSourceFreshness(sources,chain,now=Date.now()){
 const items=(sources??[]).filter(source=>source.chain===chain).map(source=>{
  const at=Date.parse(source.receivedAt??''),valid=Number.isFinite(at)&&at<=now+2000,age=valid?Math.max(0,now-at):Infinity;
  const cadence=Number.isFinite(source.cadenceMs)&&source.cadenceMs>0?source.cadenceMs:60000;
  return {source,age,stale:!valid||age>cadence*2+10000};
 });
 const endpoints=new Set(items.map(item=>item.source.endpoint)),scoped=items.some(item=>['market_rank','trenches'].includes(item.source.endpoint));
 const missing=scoped?['market_rank','trenches'].filter(endpoint=>!endpoints.has(endpoint)):[];
 const stale=items.length>0&&items.every(item=>item.stale),partial=items.length>0&&!stale&&(missing.length>0||items.some(item=>item.stale));
 return {items,age:items.length?Math.min(...items.map(item=>item.age)):Infinity,stale,partial,missing};
}
// Prefer the token's own endpoint. An unscoped token needs the whole chain
// current before a fresh snapshot omission can be treated as a normal exit.
export function isTokenSourceDelayed(token,sources,now=Date.now()){
 const chain=canonicalChain(token.chain);if(!chain)return true;
 const state=networkSourceFreshness(sources,chain,now),endpoint=token.observationMetadata?.endpoint;
 if(['market_rank','trenches'].includes(endpoint)){
  const matching=state.items.filter(item=>item.source.endpoint===endpoint);
  return !matching.length||matching.every(item=>item.stale);
 }
 return !state.items.length||state.stale||state.partial;
}
const cohortOrder=(view,now)=>(a,b)=>view==='global'?0:(b.ranking?.swaps??0)-(a.ranking?.swaps??0)||sourceAge(a,now)-sourceAge(b,now)||tokenKey(a).localeCompare(tokenKey(b));
export function sceneCohort(tokens,{view='global',hours=24,minCap=0,quality=false,trackedKeys=new Set(),now=Date.now(),observationNow=now}={}){
 return tokens.filter(t=>{
  if(minCap>0&&(numericField(t,'market_cap')??-1)<=minCap)return false;
  const eligibility=quality?tokenEligibility(t,now,observationNow):null;
  if(eligibility&&!eligibility.eligible)return false;
  if(trackedKeys.has(tokenKey(t)))return true;
  const age=sourceAge(t,now);
  return view==='global'||eligibility?.intro||age!==null&&age<=hours*3600000&&activeRanking(t,observationNow);
 // Both comparisons use the same explicit 5m ranking window.
 }).sort(cohortOrder(view,now));
}
