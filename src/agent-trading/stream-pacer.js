import {groupDataPoints} from './field-families.js';
const defaults={robinhood:15000,bsc:15000,solana:15000};
function order(id){let h=2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return (h^(h>>>16))>>>0;}
function interleavedGroups(rows){
 const tokens=new Map();
 for(const g of groupDataPoints(rows)){
  if(!tokens.has(g.tokenKey))tokens.set(g.tokenKey,[]);
  for(let i=0;i<g.rows.length;i+=4)tokens.get(g.tokenKey).push({...g,id:g.id+':'+i,rows:g.rows.slice(i,i+4)});
 }
 const sets=[...tokens.entries()].sort((a,b)=>order(a[0])-order(b[0])).map(([,groups])=>groups.sort((a,b)=>order(a.id)-order(b.id))),result=[];
 for(let round=0;sets.some(set=>round<set.length);round++)for(const set of sets)if(round<set.length)result.push(set[round]);
 return result;
}
// Scheduling changes display time only. No replay, fabricated rows or timestamps.
export function createStreamPacer(){
 const batches=[],seen=new Set();let received=0,shown=0,superseded=0,lastPresented=0,visible=null;
 function discard(index){
  const batch=batches[index];
  superseded+=batch.items.slice(batch.index).reduce((n,g)=>n+g.rows.length,0);
  batches.splice(index,1);
 }
 return {
  setVisibleKeys(keys){visible=new Set(keys);},
  // Replace only the transient animation queue, never durable capture history.
  resetWindow(){for(let i=batches.length-1;i>=0;i--)discard(i);},
  resume(now){
   const latest=batches.at(-1)?.window;
   for(let i=batches.length-1;i>=0;i--)if(latest&&batches[i].window!==latest)discard(i);
   // Spread the retained fields again, instead of flushing overlapping paused
   // cycles into the GPU together. Original evidence remains unchanged.
   for(const batch of batches){
    batch.items=batch.items.slice(batch.index);batch.index=0;batch.start=now;
    let fields=0;const offsets=batch.items.map(g=>(fields+=g.rows.length));
    batch.offsets=offsets.map(n=>n/fields);
   }
  },
  add(route,now,sources=[],wallNow=Date.now()){
   const rows=route.rows.filter(row=>{if(seen.has(row.id))return false;seen.add(row.id);return true;});received+=rows.length;
   // Replays are also excluded by the upstream capture contract.
   if(seen.size>200000){const keep=Array.from(seen).slice(-100000);seen.clear();keep.forEach(id=>seen.add(id));}
   // Mix token identities throughout the window, including a filtered cohort.
   // A large family is split for display only; every original row is retained.
   const groups=interleavedGroups(rows);
   if(route.presentation){
    const presentation=route.presentation;
    // Every network spans the same window, even when its field count differs.
    // Weight by original fields so presentation follows the verified counters.
    const sourceStart=now+Date.parse(presentation.startsAt??presentation.publishedAt)-wallNow;
    const start=Math.max(now,sourceStart);
    const window=presentation.cycleId??presentation.startsAt??presentation.publishedAt;
    // A paused browser keeps two recent cycles, never hours of stale animation.
    const windows=[...new Set([...batches.map(b=>b.window),window].filter(Boolean))];
    const retained=new Set(windows.slice(-2));
    for(let i=batches.length-1;i>=0;i--)if(batches[i].window&&!retained.has(batches[i].window))discard(i);
    const lane=g=>g.chain+':'+(visible?visible.has(g.tokenKey):true);
    for(const key of new Set(groups.map(lane))){
     const items=groups.filter(g=>lane(g)===key);let fields=0;
     const offsets=items.map(g=>(fields+=g.rows.length));
     batches.push({items,index:0,start,window,duration:presentation.durationMs??presentation.periodMs,offsets:offsets.map(n=>n/fields)});
    }
    return;
   }
   for(const captureId of new Set(groups.map(g=>g.chain+':'+g.captureId))){
    const items=groups.filter(g=>g.chain+':'+g.captureId===captureId);if(!items.length)continue;const chain=items[0].chain,endpoint=items[0].rows[0].endpoint;
    const supplied=sources.find(s=>s.chain===chain&&(!endpoint||!s.endpoint||s.endpoint===endpoint))?.cadenceMs;
    const duration=Number.isFinite(supplied)?Math.max(5000,Math.min(120000,supplied)):defaults[chain];
    batches.push({items,index:0,start:now,duration});
   }
  },
  defer(milliseconds){if(!Number.isFinite(milliseconds)||milliseconds<=0)return;for(const batch of batches)batch.start+=milliseconds;},
  take(now,wallNow=Date.now()){
   const due=[];
   for(const batch of batches){
    while(batch.index<batch.items.length){
     const fraction=batch.offsets?.[batch.index]??(batch.index+1)/batch.items.length;
     const at=batch.start+fraction*batch.duration;if(at>now)break;
     due.push({group:batch.items[batch.index++],at});
    }
   }
   for(let i=batches.length-1;i>=0;i--)if(batches[i].index===batches[i].items.length)batches.splice(i,1);
   due.sort((a,b)=>a.at-b.at);lastPresented=Math.max(lastPresented,wallNow);
   const groups=due.map(x=>({...x.group,presentedAt:new Date(lastPresented).toISOString()}));shown+=groups.reduce((n,g)=>n+g.rows.length,0);return groups;
  },
  stats(){return {received,shown,superseded,pending:received-shown-superseded};}
 };
}
