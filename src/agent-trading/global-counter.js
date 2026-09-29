export function counterAt(stats,now=Date.now()){
 if(!stats)return 0;
 const w=stats.displayWindow;
 if(!w||!Number.isFinite(w.start)||!(w.duration>0))return stats.total;
 const elapsed=Math.max(0,Math.min(w.duration,now-w.start));
 return Math.min(stats.total,Math.floor(w.from+(w.to-w.from)*elapsed/w.duration));
}

// Late releases can overlap. Add each release's progress instead of treating
// the previous target as already presented when the next window starts.
function networkWindows(stats,chain){
 const timeline=stats?.networkTimelines?.[chain];
 return timeline?.length?timeline:stats?.networkWindows?.[chain]?[stats.networkWindows[chain]]:[];
}
export function networkCounterAt(stats,chain,now=Date.now()){
 const total=stats?.byChain?.[chain]??0,windows=networkWindows(stats,chain);
 if(!windows.length)return total;
 const presented=windows.reduce((sum,w)=>sum+(w.to-w.from)*Math.max(0,Math.min(w.duration,now-w.start))/w.duration,windows[0].from);
 return Math.min(total,Math.floor(presented));
}
export function totalCounterAt(stats,now=Date.now()){
 return stats?.networkWindows||stats?.networkTimelines?Object.keys(stats.byChain).reduce((sum,chain)=>sum+networkCounterAt(stats,chain,now),0):counterAt(stats,now);
}
export function lastPresentedAt(stats,chain,now=Date.now()){
 let latest=null;
 for(const w of networkWindows(stats,chain)){
  if(w.to<=w.from||now<w.start)continue;
  const presented=Math.floor(Math.min(1,(now-w.start)/w.duration)*(w.to-w.from));
  if(presented>0)latest=Math.max(latest??-Infinity,w.start+presented/(w.to-w.from)*w.duration);
 }
 return latest;
}
export function elapsedLabel(ms){
 if(!Number.isFinite(ms))return '—';
 ms=Math.max(0,ms);
 if(ms<1000)return Math.floor(ms)+' ms';
 if(ms<60000)return (ms/1000).toFixed(3)+' s';
 if(ms<3600000)return Math.floor(ms/60000)+'m '+Math.floor(ms/1000)%60+'s';
 return Math.floor(ms/3600000)+'h '+Math.floor(ms/60000)%60+'m';
}
