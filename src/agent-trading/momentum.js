// Each detected identity gets its own turn. Later batches never replace a queue.
export function createMomentum({slots=4,holdMs=6500,travelMs=1100}={}){
 const queued=[],active=new Map(),seen=new Set();
 return {
  add(keys){for(const key of keys)if(!seen.has(key)){seen.add(key);queued.push(key);}},
  frame(now){
   for(const [slot,item] of active)if(item.done)active.delete(slot);
   for(let slot=0;slot<slots&&queued.length;slot++)if(!active.has(slot))active.set(slot,{key:queued.shift(),start:now});
   return [...active].map(([slot,item])=>{const progress=Math.max(0,Math.min(1,(now-item.start-holdMs)/travelMs));item.done=progress===1;item.departed=progress>0;return {key:item.key,slot,progress};});
  },
  defer(ms){for(const item of active.values())item.start+=Math.max(0,ms);},
  pending:()=>queued.length+active.size,
  waiting:key=>queued.includes(key),
  waitingForField:key=>queued.includes(key)||[...active.values()].some(item=>item.key===key&&!item.departed),
 };
}
