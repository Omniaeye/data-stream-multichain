// Bounded rendering batches. Counts survive visual coalescing.
// Hidden destinations are grouped by network, never assigned to another token.
export function createBrainQueue(visibleKeys){
 const visible=new Set(visibleKeys),pending=new Map();
 const totals={received:0,delivered:0,inFlight:0,visible:0,other:0,changed:0,unverified:0};
 return {
  push(route){totals.unverified+=route.unverified??0;for(const packet of route.packets){
   const shown=visible.has(packet.tokenKey),destination=shown?packet.tokenKey:'other:'+packet.chain;
   const key=packet.zone+':'+destination,existing=pending.get(key);
   if(existing){existing.count+=packet.count;existing.changed+=packet.changed;existing.batches++;existing.latest=packet;}
   else pending.set(key,{key,destination,zone:packet.zone,chain:packet.chain,count:packet.count,changed:packet.changed,batches:1,latest:packet});
   totals.received+=packet.count;totals.changed+=packet.changed;
   totals[shown?'visible':'other']+=packet.count;
  }},
  take(){const first=pending.entries().next().value;if(!first)return null;pending.delete(first[0]);totals.inFlight+=first[1].count;return first[1];},
  complete(batch){totals.inFlight-=batch.count;totals.delivered+=batch.count;},
  stats(){return {...totals,pending:totals.received-totals.delivered-totals.inFlight,queuedRoutes:pending.size};}
 };
}
