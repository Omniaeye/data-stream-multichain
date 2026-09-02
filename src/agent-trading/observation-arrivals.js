import {compareObservations} from './token-observation.js';

// One pulse represents a batch of fields, never a trade or order.
export function arrivalBatches(previous,next){
 if(!previous||previous.tokenKey!==next.tokenKey)return [];
 const comparison=compareObservations(previous,next);
 if(comparison.status!=='updated')return [];
 const changed=new Set(comparison.changes.map(c=>c.key));
 const groups=new Map();
 for(const field of next.fields){
  if(field.status!=='present')continue;
  const group=groups.get(field.zone)??{id:next.captureId+':'+field.zone,zone:field.zone,captureId:next.captureId,receivedAt:next.receivedAt,count:0,changed:0};
  group.count++;if(changed.has(field.key))group.changed++;groups.set(field.zone,group);
 }
 return [...groups.values()];
}
export function enqueueArrivals(queue,incoming,limit=10){
 const ids=new Set(queue.map(x=>x.id)),added=incoming.filter(x=>!ids.has(x.id)&&ids.add(x.id));
 const all=[...queue,...added],overflow=all.slice(0,Math.max(0,all.length-limit));
 return {queue:all.slice(-limit),omittedFields:overflow.reduce((n,b)=>n+b.count,0)};
}
