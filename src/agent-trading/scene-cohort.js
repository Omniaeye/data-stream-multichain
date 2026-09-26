import {numericField,tokenKey} from './token-selection.js';
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
export function sceneCohort(tokens,{view='global',hours=24,minCap=0,quality=false,trackedKeys=new Set(),now=Date.now()}={}){
 return tokens.filter(t=>{
  if(minCap>0&&(numericField(t,'market_cap')??-1)<=minCap)return false;
  const eligibility=quality?tokenEligibility(t,now):null;
  if(eligibility&&!eligibility.eligible)return false;
  if(trackedKeys.has(tokenKey(t)))return true;
  const age=sourceAge(t,now);
  return view==='global'||eligibility?.intro||age!==null&&age<=hours*3600000&&activeRanking(t,now);
 // Both comparisons use the same explicit 5m ranking window.
 }).sort((a,b)=>view==='global'?0:(b.ranking?.swaps??0)-(a.ranking?.swaps??0)||sourceAge(a,now)-sourceAge(b,now)||tokenKey(a).localeCompare(tokenKey(b)));
}
