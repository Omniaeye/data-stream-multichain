import {useEffect,useMemo,useRef,useState} from 'react';
import type {Capture,Token} from './AgentTradingJev';
import {createUniverse,type BrainInspection} from './attractor-universe';
import {routeCapturedData} from './brain-routing';
import {tokenKey} from './token-selection';
import {selectAttractors,TOKEN_EXIT_GRACE_MS} from './attractor-selection';
import {BrainDetails} from './BrainDetails';
import {DataStream} from './DataStream';
import {appendGroupedStream,type GroupedStream} from './field-families';
import {createStreamPacer} from './stream-pacer';
import {trackedSocialKeys} from './social-trace';
import {sceneCohort} from './scene-cohort';
import {TokenArrivalNotice} from './TokenArrivalNotice';
import {TokenHoverCard} from './TokenHoverCard';
import {NewsTokenLinks} from './NewsTokenLinks';
import {useNewsSnapshot} from './useNewsSnapshot';
import {ObservatoryEye} from './ObservatoryEye';
import {SceneIcon} from './SceneIcon';
import './attractor-preview.css';

export function AttractorPreview({capture,connectionError,arrivalHistoryKey}:{capture?:Capture;connectionError:boolean;arrivalHistoryKey?:string}){
 const host=useRef<HTMLDivElement>(null),engine=useRef<ReturnType<typeof createUniverse>|null>(null),retained=useRef<Token[]>([]);
 const [view,setView]=useState('global'),[streamOpen,setStreamOpen]=useState(false);
 const [tracing,setTracing]=useState(false),focusRequest=useRef<string|null>(null);
 const news=useNewsSnapshot(!!capture&&capture.mode!=='fixture');
 const [selected,setSelected]=useState<string|null>(null),[paused,setPaused]=useState(false),[error,setError]=useState(false);
 const [brain,setBrain]=useState<BrainInspection|null>(null),previous=useRef<Capture|undefined>(undefined);
 const pacer=useRef(createStreamPacer());
 const motionFrozen=useRef(false);
 const [stream,setStream]=useState<GroupedStream>({rows:[],total:0,byChain:{}});
 useEffect(()=>{const query=matchMedia('(max-width:1120px)');const changed=()=>{if(!query.matches)setStreamOpen(false);};query.addEventListener('change',changed);return()=>query.removeEventListener('change',changed);},[]);
 const rosterTick=Math.floor(Date.now()/1000);
 const tokens=useMemo(()=>{
  retained.current=selectAttractors(retained.current,capture?.tokens??[],{exitGraceMs:TOKEN_EXIT_GRACE_MS});
  return retained.current;
 },[capture,rosterTick]);

 // Also expire stale ranking eligibility when the connection stops updating.
 const cohortTick=Math.floor(Date.now()/5000);
 const tracked=useMemo(()=>trackedSocialKeys(news.snapshot?.links??[],news.now),[news.snapshot,news.now]);
 const visible=useMemo(()=>sceneCohort(tokens,{view,hours:24,quality:true,trackedKeys:tracked}),[tokens,view,cohortTick,tracked]);
 const visibleKeys=useMemo(()=>visible.map(tokenKey),[visible]);
 const eligibleKeys=useMemo(()=>view==='global'?visibleKeys:sceneCohort(tokens,{quality:true}).map(tokenKey),[tokens,view,cohortTick,visibleKeys]);
 function locateToken(key:string){if(!visibleKeys.includes(key))setView('global');focusRequest.current=key;setSelected(key);setBrain(null);}
 useEffect(()=>{if(!host.current)return;previous.current=undefined;pacer.current=createStreamPacer();setStream({rows:[],total:0,byChain:{}});const scene=createUniverse(host.current,key=>{setSelected(key);setBrain(null);},()=>setError(true),(_zone,inspection)=>{setSelected(null);setBrain(inspection);});engine.current=scene;
  let listGroups: ReturnType<typeof pacer.current.take>=[],lastListPaint=0,lastReport=0,lastTick=performance.now();
  const visibilityChanged=()=>{
   lastTick=performance.now();
   if(document.hidden){pacer.current.resetWindow();previous.current=undefined;}
  };
  document.addEventListener('visibilitychange',visibilityChanged);
  const timer=setInterval(()=>{const now=performance.now(),gap=now-lastTick;lastTick=now;
   if(document.hidden)return;
   if(host.current&&now-lastReport>=250){lastReport=now;host.current.dataset.presentation=JSON.stringify(pacer.current.stats());}
   if(motionFrozen.current){pacer.current.defer(gap);return;}
   if(gap>250)pacer.current.defer(gap-16);
   const groups=pacer.current.take(now);listGroups.push(...groups);
   if(listGroups.length&&now-lastListPaint>=100){const ready=listGroups;listGroups=[];lastListPaint=now;setStream(value=>appendGroupedStream(value,ready));}
   if(!groups.length)return;const rows=groups.flatMap(g=>g.rows),keys=new Set(retained.current.map(tokenKey)),visible=rows.filter(r=>keys.has(r.tokenKey)).length;
   scene.ingest({paced:true,rows,packets:[],observations:rows.length,visibleObservations:visible,otherObservations:rows.length-visible,captures:new Set(rows.map(r=>r.captureId)).size,unverified:0});
  },16);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibilityChanged);scene.dispose();};},[]);
 useEffect(()=>{engine.current?.setMode(view);},[view]);
 useEffect(()=>{engine.current?.setTracked(tracing?[...tracked]:[]);},[tracing,tracked]);
 useEffect(()=>{engine.current?.setTokens(tokens);},[tokens]);
 useEffect(()=>{engine.current?.setSources(capture?.sources??[]);},[capture]);
 useEffect(()=>{engine.current?.setCohort(visibleKeys);pacer.current.setVisibleKeys(visibleKeys);},[visibleKeys]);
 useEffect(()=>{engine.current?.setSelected(selected);},[selected]);
 useEffect(()=>{const key=focusRequest.current;if(key&&visibleKeys.includes(key)){engine.current?.revealToken(key);focusRequest.current=null;}},[selected,visibleKeys]);
 useEffect(()=>{if(document.hidden){previous.current=undefined;return;}const route=routeCapturedData(previous.current,capture,tokens.map(tokenKey));pacer.current.add(route,performance.now(),capture?.sources);previous.current=capture;},[capture,tokens]);
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setSelected(null);setBrain(null);setStreamOpen(false);}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
 return <main className="attractor-page with-data-stream" data-trace={tracing} data-view={view}><div className="attractor-field" ref={host}/>
  <DataStream open={streamOpen} onClose={()=>setStreamOpen(false)} value={stream} globalStats={capture?.globalStats} sources={capture?.sources} presentation={capture?.presentation} connectionError={connectionError} onSelectDatum={datum=>engine.current?.selectDatum(datum)}/>
  {streamOpen&&<button className="stream-backdrop" aria-label="Close data stream" onClick={()=>setStreamOpen(false)}/>}
  <nav className="scene-modes" aria-label="Market universe">
   <button className="stream-launch" aria-label="Open data stream" aria-expanded={streamOpen} aria-controls="incoming-data-stream" onClick={()=>setStreamOpen(value=>!value)}><ObservatoryEye/><span>Data stream</span></button>
   <div className="scene-view-switch"><button title="Active tokens, ordered by their first arrival in the feed" aria-pressed={view==='discovery'} onClick={()=>setView('discovery')}>Trending <small>NEW</small></button><button title="All eligible tokens in one view; larger circles mean larger market cap" aria-pressed={view==='global'} onClick={()=>setView('global')}>Global</button></div>
   <span className="scene-jev-trading" aria-label="JEV Trading AI, coming soon"><b>JEV TRADING AI</b><small>SOON</small></span>
   <div className="scene-tools"><button className="attractor-trace" aria-label="Social trace" title="Social trace" aria-pressed={tracing} onClick={()=>setTracing(value=>!value)}><SceneIcon kind="trace"/></button><button className="attractor-reset" aria-label="Reset view" title="Reset view" onClick={()=>engine.current?.resetView()}><SceneIcon kind="reset"/></button><button className="attractor-pause" aria-label={paused?'Resume motion':'Pause motion'} title={paused?'Resume motion':'Pause motion'} aria-pressed={paused} onClick={()=>{if(paused)pacer.current.resume(performance.now());motionFrozen.current=!paused;setPaused(!paused);engine.current?.pause(!paused);}}><SceneIcon kind={paused?'play':'pause'}/></button></div>
  </nav>
  <TokenArrivalNotice tokens={capture?.tokens??[]} visibleKeys={visibleKeys} eligibleKeys={eligibleKeys} news={news} historyKey={arrivalHistoryKey} onArrival={keys=>engine.current?.highlightTokens(keys)} onSelect={key=>{setTracing(true);locateToken(key);}}/>
  {capture?.mode!=='fixture'&&<NewsTokenLinks tokens={visible} news={news} onSelect={locateToken}/>}
  {view==='discovery'&&!visible.length&&!connectionError&&<p className="attractor-state">No new tokens meet the current activity filters.</p>}
  {(error||!tokens.length||connectionError)&&<p className="attractor-state">{error?'Particle rendering unavailable on this device.':connectionError?'Connection interrupted · last received data retained':'Waiting for network captures…'}</p>}
  {brain&&<BrainDetails value={brain} onClose={()=>setBrain(null)}/>}
  <TokenHoverCard host={host} tokens={tokens} capture={capture} visibleKeys={visibleKeys} selected={selected} onSelectedChange={setSelected} news={news} tracing={tracing} onCloseTrace={()=>setTracing(false)}/>
 </main>;
}
