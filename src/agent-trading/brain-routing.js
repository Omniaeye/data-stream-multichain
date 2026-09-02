import {tokenKey} from './token-selection.js';
import {parameterFor} from './parameter-catalog.js';

const zones={Market:'market',Holders:'holders',Risk:'risk',Lifecycle:'identity',Social:'social'};
/** One packet is an exact count of received allowlisted fields, never a trade. */
export function routeCapturedData(previous,next,visibleKeys){
 if(!next)return {packets:[],rows:[],observations:0,visibleObservations:0,otherObservations:0,captures:0,unverified:0};
 if(next.batches){
  const routes=next.batches.map(batch=>routeCapturedData(previous?.batches?.find(old=>old.source===batch.source&&old.tokens[0]?.chain===batch.tokens[0]?.chain&&old.tokens[0]?.observationMetadata?.endpoint===batch.tokens[0]?.observationMetadata?.endpoint),batch,visibleKeys));
  return {presentation:next.presentation,rows:routes.flatMap(r=>r.rows),packets:routes.flatMap(r=>r.packets),...Object.fromEntries(['observations','visibleObservations','otherObservations','captures','unverified'].map(key=>[key,routes.reduce((n,r)=>n+r[key],0)]))};
 }
 const old=new Map((previous?.tokens??[]).map(t=>[tokenKey(t),t]));
 const seenSources=new Set(),packets=[],rows=[],visible=new Set(visibleKeys);
 let observations=0,visibleObservations=0,otherObservations=0,unverified=0;
 for(const token of next.tokens){
  const evidence=token.evidence??next,previousToken=old.get(tokenKey(token));
  if(!evidence.captureId||!evidence.captureHash){unverified+=token.fields.length;continue;}
  if(previousToken?.evidence?.captureId===evidence.captureId)continue;
  if(previousToken?.evidence?.receivedAt&&Date.parse(evidence.receivedAt)<Date.parse(previousToken.evidence.receivedAt))continue;
  seenSources.add(evidence.captureId);
  const key=tokenKey(token),isVisible=visible.has(key),byZone=new Map();
  for(const field of token.fields){
   const definition=parameterFor(field.key);
   const zone=zones[definition?.group]??'other';
   const group=byZone.get(zone)??{count:0,changed:0,fieldIds:[],examples:[],fields:[]};
   group.count++;group.fieldIds.push(field.id);
   group.fields.push(field);
   if(group.examples.length<3)group.examples.push({key:field.key,label:definition?.label??field.key,value:field.value,path:field.path});
   const before=previousToken?.fields.find(f=>f.key===field.key);
   if(before&&before.value!==field.value)group.changed++;
   rows.push({cycleId:next.collectionCycle?.id,cycleAt:next.collectionCycle?.started_at,endpoint:token.observationMetadata?.endpoint??'market_rank',id:evidence.captureId+':'+key+':'+field.key,tokenKey:key,tokenName:token.name,chain:key.split(':')[0],captureId:evidence.captureId,captureHash:evidence.captureHash,receivedAt:evidence.receivedAt,field,zone,window:token.observationMetadata?.request_params?.query?.interval??'unknown',initial:!previous,changed:!!before&&before.value!==field.value});
   byZone.set(zone,group);
   observations++;if(isVisible)visibleObservations++;else otherObservations++;
  }
  for(const [zone,group] of byZone)packets.push({id:evidence.captureId+':'+key+':'+zone,captureId:evidence.captureId,captureHash:evidence.captureHash,receivedAt:evidence.receivedAt,tokenKey:key,zone,count:group.count,changed:group.changed,visible:isVisible,fieldIds:group.fieldIds,tokenName:token.name,chain:key.split(':')[0],examples:group.examples,fields:group.fields});
 }
 return {packets,rows,observations,visibleObservations,otherObservations,captures:seenSources.size,unverified};
}
