export function counterAt(stats,now=Date.now()){
 if(!stats)return 0;
 const w=stats.displayWindow;
 if(!w||!Number.isFinite(w.start)||!(w.duration>0))return stats.total;
 const elapsed=Math.max(0,Math.min(w.duration,now-w.start));
 return Math.min(stats.total,Math.floor(w.from+(w.to-w.from)*elapsed/w.duration));
}

// Independent network windows ensure the total equals its parts.
function activeWindow(stats,chain,now){
 const timeline=stats?.networkTimelines?.[chain];
 return timeline?.length?(timeline.findLast(w=>w.start<=now)??timeline[0]):stats?.networkWindows?.[chain];
}
export function networkCounterAt(stats,chain,now=Date.now()){
 const total=stats?.byChain?.[chain]??0,w=activeWindow(stats,chain,now);
 return w?counterAt({total,displayWindow:w},now):total;
}
export function totalCounterAt(stats,now=Date.now()){
 return stats?.networkWindows||stats?.networkTimelines?Object.keys(stats.byChain).reduce((sum,chain)=>sum+networkCounterAt(stats,chain,now),0):counterAt(stats,now);
}
export function lastPresentedAt(stats,chain,now=Date.now()){
 const w=activeWindow(stats,chain,now);
 if(!w||w.to<=w.from||now<w.start)return null;
 const presented=Math.floor(Math.min(1,(now-w.start)/w.duration)*(w.to-w.from));
 return presented>0?w.start+presented/(w.to-w.from)*w.duration:null;
}
export function elapsedLabel(ms){
 if(!Number.isFinite(ms))return '—';
 ms=Math.max(0,ms);
 if(ms<1000)return Math.floor(ms)+' ms';
 if(ms<60000)return (ms/1000).toFixed(3)+' s';
 if(ms<3600000)return Math.floor(ms/60000)+'m '+Math.floor(ms/1000)%60+'s';
 return Math.floor(ms/3600000)+'h '+Math.floor(ms/60000)%60+'m';
}
