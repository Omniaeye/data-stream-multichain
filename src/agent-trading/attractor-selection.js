import {canonicalChain,tokenKey} from './token-selection.js';
export const ATTRACTOR_COUNT=1200;
// Preserve the order of current identities; include every supported incoming token.
export const TOKEN_EXIT_GRACE_MS=30000;
export function selectAttractors(previous,incoming,{now=Date.now(),exitGraceMs=0}={}){
 const unique=new Map(incoming.filter(t=>canonicalChain(t.chain)).map(t=>[tokenKey(t),t]));
 const rank=t=>{const v=t.fields.find(f=>f.key==='rank')?.value;return typeof v==='number'&&Number.isFinite(v)&&v>0?v:Infinity;};
 const kept=previous.filter(t=>unique.has(tokenKey(t))).map(t=>unique.get(tokenKey(t)));
 const old=new Set(kept.map(tokenKey));
 const added=[...unique.values()].filter(t=>!old.has(tokenKey(t))).sort((a,b)=>rank(a)-rank(b)||tokenKey(a).localeCompare(tokenKey(b)));
 const leaving=exitGraceMs?previous.filter(t=>!unique.has(tokenKey(t))).map(t=>({...t,sceneAbsentSince:t.sceneAbsentSince??now})).filter(t=>now-t.sceneAbsentSince<exitGraceMs):[];
 return kept.concat(added,leaving).slice(0,ATTRACTOR_COUNT);
}
