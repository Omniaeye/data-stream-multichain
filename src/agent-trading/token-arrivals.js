import {tokenKey} from './token-selection.js';
export const TOKEN_NOTICE_MS=2800;
export const TOKEN_NEW_MARK_MS=30000;
export const TOKEN_HISTORY_KEY='omnia:jev:seen-tokens:v1';
// First observation in this browser session is not proof of a freshly minted token.
// The first nonempty snapshot establishes the baseline, without announcement.
export function createTokenArrivals({storage,storageKey=TOKEN_HISTORY_KEY,pendingMs=0}={}){
 const seen=new Set(),pending=new Map();let initialized=false,sequence=0,baselineAt=null;
 try{
  const saved=JSON.parse(storage?.getItem(storageKey)??'null');
  if(saved?.version===1&&Array.isArray(saved.keys))for(const key of saved.keys)if(typeof key==='string'&&/^(robinhood|bsc|solana):.+$/.test(key))seen.add(key);
 }catch{/* Storage can be disabled or full; session deduplication remains available. */}
 return {
  ingest(tokens,visibleKeys,now){
   if(!tokens.length){pending.clear();return null;}
   const visible=new Set(visibleKeys),present=new Set(tokens.map(tokenKey)),fresh=[];let changed=false;
   for(const [key,expiresAt] of pending)if(!present.has(key)||now>=expiresAt)pending.delete(key);
   for(const token of tokens){const key=tokenKey(token);if(!seen.has(key)){
    changed=true;const firstSeen=Date.parse(token.firstSeenAt),recentDetection=!Number.isFinite(firstSeen)||firstSeen>baselineAt&&firstSeen<=now;
    if(visible.has(key)&&recentDetection)fresh.push(token);
    else if(initialized&&pendingMs>0&&Number.isFinite(firstSeen)&&firstSeen>baselineAt&&firstSeen<=now&&now<firstSeen+pendingMs)pending.set(key,firstSeen+pendingMs);
    seen.add(key);
   }else if(pending.has(key)&&visible.has(key)){fresh.push(token);pending.delete(key);}}
   if(changed)try{storage?.setItem(storageKey,JSON.stringify({version:1,keys:[...seen]}));}catch{/* Never break the live field if browser persistence fails. */}
   if(!initialized){initialized=true;baselineAt=now;return null;}
   return fresh.length?{id:++sequence,tokens:fresh,detectedAt:now,expiresAt:now+TOKEN_NOTICE_MS}:null;
  }
 };
}
