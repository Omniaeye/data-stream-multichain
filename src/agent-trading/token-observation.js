import {ORGANISM_PARAMETERS} from './organism-contract.js';
import {canonicalChain,tokenKey} from './token-selection.js';

// Endpoint-specific documented units; documentation is not independent validation.
const documentedUnits={price:'USD/token',market_cap:'USD',history_highest_market_cap:'USD',top_10_holder_rate:'ratio',rug_ratio:'source_score_0_1',creation_timestamp:'unix_seconds',open_timestamp:'unix_seconds'};
const aggregates=new Set(['buys','sells','swaps','volume']);
const intervals=new Set(['1m','5m','1h','6h','24h']);
const validTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

/** Builds a detached snapshot. Metadata must belong to the original source capture. */
export function observeToken(token,metadata){
 const e=token.evidence;
 if(!canonicalChain(token.chain)||metadata?.endpoint!=='market_rank'||canonicalChain(metadata.chain)!==canonicalChain(token.chain))throw new Error('Unsupported or mismatched source');
 if(!e?.captureId||!e.captureHash||metadata.capture_id!==e.captureId||metadata.raw_sha256!==e.captureHash)throw new Error('Capture evidence mismatch');
 if(!validTime(metadata.received_at))throw new Error('Missing reception time');
 const seen=new Set();
 for(const f of token.fields){if(seen.has(f.key))throw new Error('Duplicate parameter');seen.add(f.key);}
 const interval=metadata.request_params?.query?.interval;
 const window=intervals.has(interval)?interval:null;
 const fields=ORGANISM_PARAMETERS.map(p=>{
  const f=token.fields.find(f=>f.key===p.key);
  const scalar=f&&(typeof f.value==='string'||typeof f.value==='boolean'||(typeof f.value==='number'&&Number.isFinite(f.value)));
  const status=!f||f.value==null||f.value===''?'missing':scalar?'present':'invalid';
  if(f&&(!f.id||typeof f.path!=='string'||!f.path.endsWith('/'+p.key)))throw new Error('Missing field evidence');
  const requestAggregate=aggregates.has(p.key);
  const unit=documentedUnits[p.key]??(requestAggregate?(p.key==='volume'?'USD':'count'):null);
  return {key:p.key,zone:p.zone,status,raw:scalar?f.value:null,
   unit:unit??p.unit,semanticStatus:unit?'documented':'unresolved',independentlyVerified:false,
   window:requestAggregate?window:null,windowBasis:requestAggregate&&window?'capture_request':null,
   eventTime:(p.key==='creation_timestamp'||p.key==='open_timestamp')&&typeof f?.value==='number'&&f.value>0&&Number.isFinite(new Date(f.value*1000).getTime())?new Date(f.value*1000).toISOString():null,
   evidence:f?{fieldId:f.id,path:f.path,captureId:e.captureId,captureHash:e.captureHash}:null};
 });
 return freeze({tokenKey:tokenKey(token),captureId:e.captureId,captureHash:e.captureHash,receivedAt:metadata.received_at,
  sourceEventAt:validTime(metadata.source_event_at)?metadata.source_event_at:null,endpoint:'market_rank',fields});
}

/** Snapshot changes never stand in for individual buys, sells or orders. */
export function compareObservations(before,after){
 if(before.tokenKey!==after.tokenKey)throw new Error('Different tokens');
 if(before.captureId===after.captureId){if(before.captureHash!==after.captureHash)throw new Error('Conflicting capture');return freeze({status:'duplicate',changes:[]});}
 if(Date.parse(after.receivedAt)<=Date.parse(before.receivedAt))return freeze({status:'out_of_order',changes:[]});
 const changes=after.fields.flatMap(next=>{
  const previous=before.fields.find(f=>f.key===next.key);
  if(previous.status===next.status&&Object.is(previous.raw,next.raw)&&previous.window===next.window)return [];
  const comparable=previous.status==='present'&&next.status==='present'&&previous.window===next.window&&(!aggregates.has(next.key)||next.window!==null);
  return [{key:next.key,zone:next.zone,before:previous,after:next,
   delta:comparable&&typeof previous.raw==='number'&&typeof next.raw==='number'?next.raw-previous.raw:null,
   kind:aggregates.has(next.key)?'aggregate_change':'snapshot_change',individualTradeCount:null}];
 });
 return freeze({status:'updated',changes});
}
