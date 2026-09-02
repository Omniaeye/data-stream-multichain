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
 const batches=[],seen=new Set();let received=0,shown=0,lastPresented=0,presentationDelay=0,visible=null;
 return {
  setVisibleKeys(keys){visible=new Set(keys);},
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
    presentationDelay=Math.max(presentationDelay,now-sourceStart);
    const start=sourceStart+presentationDelay;
    const lane=g=>g.chain+':'+(visible?visible.has(g.tokenKey):true);
    for(const key of new Set(groups.map(lane))){
     const items=groups.filter(g=>lane(g)===key);let fields=0;
     const offsets=items.map(g=>(fields+=g.rows.length));
     batches.push({items,index:0,start,duration:presentation.durationMs??presentation.periodMs,offsets:offsets.map(n=>n/fields)});
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
  defer(milliseconds){if(!Number.isFinite(milliseconds)||milliseconds<=0)return;for(const batch of batches)batch.start+=milliseconds;presentationDelay+=milliseconds;},
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
  stats(){return {received,shown,pending:received-shown};}
 };
}
