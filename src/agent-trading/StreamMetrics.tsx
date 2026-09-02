import {useEffect,useRef} from 'react';
import type {Capture,GlobalFieldStats} from './AgentTradingJev';
import {elapsedLabel,lastPresentedAt,networkCounterAt,totalCounterAt} from './global-counter';
import {chainMark} from './network-marks';
const chains=['robinhood','bsc','solana'];
const names=['Robinhood Chain','BSC','Solana'];
const format=new Intl.NumberFormat('en-US');

// Paint counters independently of React's virtual list. No timer creates data.
export function StreamMetrics({stats,sources,total,byChain,connectionError=false}:{stats?:GlobalFieldStats;sources?:Capture['sources'];total:number;byChain:Record<string,number>;connectionError?:boolean}){
 const root=useRef<HTMLDivElement>(null),latest=useRef({stats,sources,total,byChain,connectionError});latest.current={stats,sources,total,byChain,connectionError};
 useEffect(()=>{let frame=0;const count=root.current?.querySelector<HTMLElement>('[data-total-count]'),ports=Array.from(root.current?.querySelectorAll<HTMLElement>('[data-chain]')??[]);
  function paint(){
   const {stats,sources,total,byChain,connectionError}=latest.current,now=Date.now();
   if(count){count.textContent=format.format(stats?totalCounterAt(stats,now):total);count.dataset.globalFields=String(stats?.total??total);}
   for(const [i,port] of ports.entries()){
    const chain=chains[i],networkSources=sources?.filter(s=>s.chain===chain)??[],source=networkSources.slice().sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt))[0];
    const age=source?Math.max(0,now-Date.parse(source.receivedAt)):Infinity,cadence=source?.cadenceMs??60000;
    const delivered=stats?lastPresentedAt(stats,chain,now):null,elapsed=delivered===null?Infinity:Math.max(0,now-delivered);
    port.querySelector('b')!.textContent=format.format(stats?networkCounterAt(stats,chain,now):byChain[chain]??0);
    const stale=!!source&&age>cadence*2+10000;
    port.querySelector('small')!.textContent=connectionError?'Reconnecting':stale?'Stale':delivered===null?'Waiting':'Δ '+elapsedLabel(elapsed);
    port.dataset.stale=String(connectionError||stale);
    // Source time remains available; presentation precision is not ingest latency.
    port.title=names[i]+' · Last presented data point '+elapsedLabel(elapsed)+' ago · Capture age '+elapsedLabel(age)+' · '+networkSources.map(s=>(s.endpoint==='trenches'?'Launches':'Ranking')+' every '+((s.cadenceMs??0)/1000).toFixed(0)+'s'+(s.measuredCadenceMs?' (measured '+(s.measuredCadenceMs/1000).toFixed(1)+'s)':'')).join(' / ');
   }
   frame=requestAnimationFrame(paint);
  }
  frame=requestAnimationFrame(paint);return()=>cancelAnimationFrame(frame);
 },[]);
 return <div ref={root} className="stream-metrics">
  <div className="stream-totals" title={`Verified fields recorded by this preview${stats?.startedAt?' since '+stats.startedAt:''}. This is not the complete OMNIA archive. Repeated snapshots are observations, not trades.`}><strong data-total-count data-global-fields={stats?.total??total}>—</strong><span>Total data points</span></div>
  <div className="stream-networks">{chains.map((chain,i)=><div key={chain} data-chain={chain}><img src={chainMark(chain)} alt={names[i]}/><span className="stream-network-name">{chain==='robinhood'?'Robinhood':names[i]}</span><b>—</b><small>Waiting</small></div>)}</div>
 </div>;
}
