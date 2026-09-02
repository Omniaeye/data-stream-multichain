// Presentation only: endpoints always come from observations, never a forecast.
export function createValueMotion(duration=900){
 let from=null,to=null,start=0;
 const at=now=>{if(from===null||to===null)return to;const t=Math.max(0,Math.min(1,(now-start)/duration));return t===1?to:from+(to-from)*(1-(1-t)**3);};
 return {at,active:now=>from!==null&&to!==null&&from!==to&&now<start+duration,set(value,now,instant=false){const next=typeof value==='number'&&Number.isFinite(value)?value:null;if(next===to)return false;const current=at(now);from=instant||current===null||next===null?next:current;to=next;start=now;return true;}};
}
