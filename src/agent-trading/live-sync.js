import {tokenKey,canonicalChain} from './token-selection.js';
export const revisionOf = capture => `${capture.captureId}:${capture.captureHash}`;
export function makeDelta(previous,next){
 const old=new Map(previous.tokens.map(t=>[tokenKey(t),JSON.stringify(t)]));
 const keys=new Set(next.tokens.map(tokenKey));
 const {tokens,...metadata}=next;
 return {kind:'delta',base:revisionOf(previous),revision:revisionOf(next),metadata,
  upsert:tokens.filter(t=>old.get(tokenKey(t))!==JSON.stringify(t)),remove:previous.tokens.map(tokenKey).filter(k=>!keys.has(k)),order:tokens.map(tokenKey)};
}
function validateTokens(tokens){
 if(!Array.isArray(tokens)||tokens.length>1200)throw new Error('Invalid token limit');
 const seen=new Set();
 for(const t of tokens){
  if(!t||typeof t.id!=='string'||typeof t.chain!=='string'||!canonicalChain(t.chain)||typeof t.name!=='string'||!Array.isArray(t.fields)||t.fields.length>100)throw new Error('Invalid token');
  const key=tokenKey(t);if(!key||seen.has(key))throw new Error('Duplicate identity');seen.add(key);
  if(t.fields.some(f=>!f||typeof f.key!=='string'||typeof f.path!=='string'||typeof f.id!=='string'||!['string','number','boolean'].includes(typeof f.value)||(typeof f.value==='number'&&!Number.isFinite(f.value))))throw new Error('Invalid field');
 }
}
export function applyEnvelope(current,message){
 if(!message||!['snapshot','delta'].includes(message.kind))throw new Error('Invalid envelope');
 let result;
 if(message.kind==='snapshot')result=message.capture;
 else{
  if(!current||message.base!==revisionOf(current))throw new Error('Revision gap');
  validateTokens(message.upsert);
  if(!Array.isArray(message.order)||message.order.length>1200||new Set(message.order).size!==message.order.length||!Array.isArray(message.remove)||message.remove.length>1200)throw new Error('Invalid delta');
  const rows=new Map(current.tokens.map(t=>[tokenKey(t),t]));
  for(const key of message.remove)rows.delete(key);
  for(const token of message.upsert)rows.set(tokenKey(token),token);
  if(rows.size!==message.order.length||message.order.some(key=>!rows.has(key)))throw new Error('Incomplete delta');
  result={...message.metadata,tokens:message.order.map(key=>rows.get(key))};
 }
 if(!result||result.mode!=='live'||typeof result.captureId!=='string'||!result.captureId||typeof result.captureHash!=='string'||!result.captureHash)throw new Error('Invalid capture');
 validateTokens(result.tokens);
 if(result.batches){if(!Array.isArray(result.batches)||result.batches.length>18)throw new Error('Invalid batches');for(const batch of result.batches){validateTokens(batch.tokens);if(!batch.captureId||!batch.captureHash||batch.batches)throw new Error('Invalid batch evidence');}}
 if(result.presentation){const p=result.presentation;if(p.periodMs!==15000||(p.durationMs!==undefined&&(!Number.isFinite(p.durationMs)||p.durationMs<1000||p.durationMs>15000))||!Number.isFinite(Date.parse(p.publishedAt))||!Number.isFinite(Date.parse(p.startedAt))||(p.startsAt&&!Number.isFinite(Date.parse(p.startsAt)))||!['complete','partial'].includes(p.status)||!Array.isArray(p.missing)||p.missing.length>6||p.expectedSources!==6||!Number.isInteger(p.sourceCount)||p.sourceCount<1||p.sourceCount>6)throw new Error('Invalid collection cycle');}
 if(revisionOf(result)!==message.revision)throw new Error('Invalid revision');
 return result;
}
export const retryDelay = (failures,random=Math.random) => failures===0?5000:Math.min(30000,1000*2**Math.min(failures,5))*(.85+random()*.3);

// Retain the last verified scene during a gap, but never request another delta
// against a revision that the server/client could not reconcile.
export function createLiveSession(){
 let current,reset=false;
 return {
  current:()=>current,
  revision:()=>current&&!reset?revisionOf(current):undefined,
  fail(){reset=true;},
  accept(status,message){
   try{
    if(status===304){if(!current||reset)throw Error('Full snapshot required');return current;}
    if(status!==200)throw Error('Capture unavailable');
    const next=applyEnvelope(current,message);current=next;reset=false;return next;
   }catch(error){reset=true;throw error;}
  }
 };
}
