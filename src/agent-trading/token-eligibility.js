import {numericField} from './token-selection.js';

export const TOKEN_ACTIVITY_POLICY=Object.freeze({introMs:30*60000,introCap:5000,matureCap:15000,minLiquidity:1000,minVolume:100,minSwaps:3,freshMs:45000});
const ageOf=(value,now)=>{const at=Date.parse(value??'');return Number.isFinite(at)&&at<=now?now-at:null;};
export function firstFeedAge(token,now=Date.now()){return ageOf(token.firstSeenAt,now);}
export function sourceAge(token,now=Date.now()){
 const dates=[numericField(token,'creation_timestamp'),numericField(token,'created_timestamp'),token.ranking?.createdAt].filter(n=>typeof n==='number'&&Number.isFinite(n)&&n>0);
 const born=dates.length?Math.min(...dates)*1000:null;return born!==null&&born<=now?now-born:null;
}
function fresh(at,now){const age=now-Date.parse(at??'');return Number.isFinite(age)&&age>=-2000&&age<=TOKEN_ACTIVITY_POLICY.freshMs;}
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const sum=(a,b)=>a!==null&&b!==null?a+b:null;
// Keep provider windows separate. Never interpret lifetime/24h totals as 5m activity.
export function tokenActivity(token,now=Date.now()){
 const r=token.ranking,fields=key=>numericField(token,key),at=token.evidence?.receivedAt;
 const direct5m=token.observationMetadata?.request_params?.query?.interval==='5m';
 if(r?.window==='5m'&&fresh(r.receivedAt,now)){
  const same=direct5m&&token.evidence?.captureId===r.captureId;
  return {window:'5m',receivedAt:r.receivedAt,volume:number(r.volume),swaps:number(r.swaps),liquidity:fields('liquidity')??number(r.liquidity),buys:same?fields('buys'):null,sells:same?fields('sells'):null};
 }
 if(direct5m&&fresh(at,now))return {window:'5m',receivedAt:at,volume:fields('volume'),liquidity:fields('liquidity'),swaps:fields('swaps')??sum(fields('buys'),fields('sells')),buys:fields('buys'),sells:fields('sells')};
 const age=sourceAge(token,now);
 // Only genuinely recent launches can use their short lifetime's 24h bucket.
 // An explicit fresh, inactive 5m ranking above must not fall back to 24h totals.
 if(age!==null&&age<TOKEN_ACTIVITY_POLICY.introMs&&fresh(at,now))return {window:'24h · new launch',receivedAt:at,volume:fields('volume_24h'),liquidity:fields('liquidity'),swaps:fields('swaps_24h')??sum(fields('buys_24h'),fields('sells_24h')),buys:fields('buys_24h'),sells:fields('sells_24h')};
 return null;
}
export function tokenEligibility(token,now=Date.now()){
 const p=TOKEN_ACTIVITY_POLICY,cap=numericField(token,'market_cap'),age=firstFeedAge(token,now),intro=age!==null&&age<p.introMs;
 const result=reason=>({eligible:reason===null,reason,intro,activity:tokenActivity(token,now)});
 if(cap===null||cap<p.introCap)return result('market_cap');
 if(!intro&&cap<=p.matureCap)return result('intro_expired');
 if(token.fields.some(f=>['is_honeypot','is_wash_trading'].includes(f.key)&&[true,1,'1','true'].includes(f.value)))return result('source_risk_flag');
 if(!fresh(token.evidence?.receivedAt,now))return result('stale_capture');
 const activity=tokenActivity(token,now);
 if(!activity)return result('activity_unavailable');
 if(activity.liquidity===null||activity.liquidity<p.minLiquidity)return result('liquidity');
 if(activity.volume===null||activity.volume<p.minVolume)return result('volume');
 if(activity.swaps===null||activity.swaps<p.minSwaps)return result('swaps');
 return result(null);
}
