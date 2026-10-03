import {applyEnvelope} from './live-sync.js';
const fields=new Set(['market_cap','liquidity','volume','swaps','buys','sells','volume_24h','swaps_24h','buys_24h','sells_24h','creation_timestamp','created_timestamp','is_honeypot','is_wash_trading','symbol']);
export const VIEW_KEY='omnia:jev:view:v1';
export function makeViewCapture(capture){
 const {batches,delivery,...view}=capture;
 return {...view,tokens:capture.tokens.map(({assessment,sceneAbsentSince,...token})=>({...token,fields:token.fields.filter(f=>fields.has(f.key))}))};
}
export function readView(storage,now=Date.now()){
 try{const raw=storage?.getItem(VIEW_KEY);if(!raw||raw.length>2500000)return;const item=JSON.parse(raw);
  if(item.version!==1||!Number.isFinite(item.savedAt)||now-item.savedAt>300000||item.savedAt>now+2000||now-Date.parse(item.capture?.receivedAt)>300000)return;
  return applyEnvelope(undefined,{kind:'snapshot',capture:item.capture,revision:item.capture.captureId+':'+item.capture.captureHash});
 }catch{return;}
}
export function saveView(storage,capture,now=Date.now()){
 try{const item=JSON.stringify({version:1,savedAt:now,capture:makeViewCapture(capture)});if(item.length<=2500000)storage?.setItem(VIEW_KEY,item);}catch{/* A disabled cache never stops live delivery. */}
}
