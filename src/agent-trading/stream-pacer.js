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
export function createStreamPacer({maxGroupsPerTake=32,maxPendingFields=65536}={}){
 const batches=[],seen=new Set();let received=0,shown=0,superseded=0,lastPresented=0,visible=null,laneCursor=0;
 const groupBudget=Math.max(1,Math.min(256,Math.floor(maxGroupsPerTake)||32));
 const fieldBudget=Math.max(4,Math.min(262144,Math.floor(maxPendingFields)||65536));
 const networkOrder=['robinhood','bsc','solana'];
 function discard(index){superseded+=batches[index].fields;batches.splice(index,1);}
 function enqueue(batch){batch.fields=batch.items.reduce((n,g)=>n+g.rows.length,0);batch.chain=batch.items[0]?.chain;batches.push(batch);}
 function boundPending(){
  const counts=new Map();let pending=0;
  for(const batch of batches){pending+=batch.fields;counts.set(batch.chain,(counts.get(batch.chain)??0)+batch.fields);}
  // One busy lane cannot evict all waiting fields from the other networks.
  while(pending>fieldBudget){
   const chain=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0];
   const index=batches.findIndex(batch=>batch.chain===chain&&batch.fields>0);if(index<0)break;
   const batch=batches[index],fields=batch.items[batch.index++].rows.length;
   batch.fields-=fields;pending-=fields;superseded+=fields;counts.set(chain,counts.get(chain)-fields);
   if(!batch.fields)batches.splice(index,1);
  }
  // Release consumed references as well as bounding pending fields.
  for(const batch of batches)if(batch.index>4096||batch.index>batch.items.length/2){
   batch.items=batch.items.slice(batch.index);if(batch.offsets)batch.offsets=batch.offsets.slice(batch.index);batch.index=0;
  }
 }
 return {
  setVisibleKeys(keys){visible=new Set(keys);},
  // Replace only the transient animation queue, never durable capture history.
  resetWindow(){for(let i=batches.length-1;i>=0;i--)discard(i);},
  resume(now){
   const latest=batches.at(-1)?.window;
   for(let i=batches.length-1;i>=0;i--)if(latest&&batches[i].window!==latest)discard(i);
   // Spread retained fields again rather than flushing overlapping paused cycles.
   for(const batch of batches){
    batch.items=batch.items.slice(batch.index);batch.index=0;batch.start=now;
    let fields=0;const offsets=batch.items.map(g=>(fields+=g.rows.length));
    batch.offsets=offsets.map(n=>n/fields);
   }
  },
  add(route,now,sources=[],wallNow=Date.now()){
   const rows=route.rows.filter(row=>{if(seen.has(row.id))return false;seen.add(row.id);return true;});received+=rows.length;
   if(seen.size>200000){const keep=Array.from(seen).slice(-100000);seen.clear();keep.forEach(id=>seen.add(id));}
   const groups=interleavedGroups(rows);
   if(route.presentation){
    const presentation=route.presentation;
    const sourceStart=now+Date.parse(presentation.startsAt??presentation.publishedAt)-wallNow;
    const start=Math.max(now,sourceStart);
    const window=presentation.cycleId??presentation.startsAt??presentation.publishedAt;
    const windows=[...new Set([...batches.map(b=>b.window),window].filter(Boolean))];
    const retained=new Set(windows.slice(-2));
    for(let i=batches.length-1;i>=0;i--)if(batches[i].window&&!retained.has(batches[i].window))discard(i);
    const lane=g=>g.chain+':'+(visible?visible.has(g.tokenKey):true);
    for(const key of new Set(groups.map(lane))){
     const items=groups.filter(g=>lane(g)===key);let fields=0;
     const offsets=items.map(g=>(fields+=g.rows.length));
     enqueue({items,index:0,start,window,duration:presentation.durationMs??presentation.periodMs,offsets:offsets.map(n=>n/fields)});
    }
    boundPending();return;
   }
   for(const captureId of new Set(groups.map(g=>g.chain+':'+g.captureId))){
    const items=groups.filter(g=>g.chain+':'+g.captureId===captureId);if(!items.length)continue;const chain=items[0].chain,endpoint=items[0].rows[0].endpoint;
    const supplied=sources.find(s=>s.chain===chain&&(!endpoint||!s.endpoint||s.endpoint===endpoint))?.cadenceMs;
    const duration=Number.isFinite(supplied)?Math.max(5000,Math.min(120000,supplied)):defaults[chain];
    enqueue({items,index:0,start:now,duration});
   }
   boundPending();
  },
  defer(milliseconds){if(!Number.isFinite(milliseconds)||milliseconds<=0)return;for(const batch of batches)batch.start+=milliseconds;},
  take(now,wallNow=Date.now()){
   const due=[],lanes=[...networkOrder,...new Set(batches.map(batch=>batch.chain).filter(chain=>!networkOrder.includes(chain)))];
   // Bounded work per animation tick, round-robin across due network lanes.
   while(due.length<groupBudget){
    let picked=false;
    for(let attempt=0;attempt<lanes.length;attempt++){
     const chain=lanes[laneCursor++%lanes.length];let earliest=null;
     for(const batch of batches){
      if(batch.chain!==chain||batch.index>=batch.items.length)continue;
      const fraction=batch.offsets?.[batch.index]??(batch.index+1)/batch.items.length;
      const at=batch.start+fraction*batch.duration;
      if(at<=now&&(!earliest||at<earliest.at))earliest={batch,at};
     }
     if(!earliest)continue;
     const group=earliest.batch.items[earliest.batch.index++];earliest.batch.fields-=group.rows.length;
     due.push(group);picked=true;break;
    }
    if(!picked)break;
   }
   for(let i=batches.length-1;i>=0;i--)if(batches[i].index===batches[i].items.length)batches.splice(i,1);
   if(!due.length)return [];
   lastPresented=Math.max(lastPresented,wallNow);
   const groups=due.map(group=>({...group,presentedAt:new Date(lastPresented).toISOString()}));shown+=groups.reduce((n,g)=>n+g.rows.length,0);return groups;
  },
  stats(){return {received,shown,superseded,pending:received-shown-superseded};}
 };
}
