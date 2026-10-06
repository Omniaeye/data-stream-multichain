import {unpackLive} from './agent-trading/live-wire';
import {fetchStream} from './agent-trading/fetch-stream';
import {readView,saveView} from './agent-trading/view-snapshot';
import {jevEndpoint} from './agent-trading/jev-endpoint';
/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import {createRoot} from 'react-dom/client';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import {lazy,Suspense,useEffect,useState} from 'react';
import type {Capture} from './agent-trading/AgentTradingJev';
import {AttractorPreview} from './agent-trading/AttractorPreview';
import {createLiveSession,retryDelay} from './agent-trading/live-sync';

const TrenchesWorkspace=lazy(()=>import('./agent-trading/TrenchesWorkspace').then(module=>({default:module.TrenchesWorkspace})));
const trenches=location.pathname==='/trenches'||location.pathname.startsWith('/trenches/')||import.meta.env.DEV&&new URLSearchParams(location.search).get('preset')==='trenches';

function App(){
 const [capture,setCapture]=useState<Capture|undefined>(()=>{try{return readView(window.localStorage);}catch{return undefined;}}),[viewOnly,setViewOnly]=useState(true),[error,setError]=useState(false),[,setClock]=useState(0);
 useEffect(()=>{
  const session=createLiveSession();
  let bootStopped=false,fullStarted=false,lastSaved=0;const bootstrapController=new AbortController();
  let stopped=false,timer:ReturnType<typeof setTimeout>,request:AbortController|undefined,failures=0,etag:string|null=null;
  async function update(){
   // The next visible poll catches up from the server; hidden tabs do not build
   // a second ingestion history or accumulate stale animation cycles.
   if(document.hidden){timer=setTimeout(update,1000);return;}
   request=new AbortController();
   try{
    const revision=session.revision();
    const {response,text}=await fetchStream(jevEndpoint('/__jev/live?sync=1&wire=1')+(revision?'&since='+encodeURIComponent(revision):''),{
     signal:request.signal,cache:'no-store',priority:'high',
     headers:revision&&etag?{'If-None-Match':etag}:{}
    });
    let message;
    if(response.status!==304){
     if(!response.ok)throw Error('Capture unavailable');
     message=unpackLive(JSON.parse(text));
    }
    const next=session.accept(response.status,message);
    etag=response.headers.get('etag')??etag;
    if(!stopped){setCapture(next);setViewOnly(false);setError(false);failures=0;if(Date.now()-lastSaved>15000){lastSaved=Date.now();try{saveView(window.localStorage,next);}catch{}}}
   }catch{
    // Transport failures keep the last verified cursor. Invalid envelopes
    // reset the session inside accept(), while a retry can still recover B.
    if(!stopped){setError(true);failures++;}
   }
   if(!stopped)timer=setTimeout(update,failures?retryDelay(failures):1000);
  }
  // Freshness and scene eligibility must advance even on 304 responses.
  const clock=setInterval(()=>{if(!document.hidden)setClock(t=>t+1);},1000);
  const startFull=()=>{if(!fullStarted&&!stopped){fullStarted=true;void update();}};
  const startup=setTimeout(startFull,1500);
  void fetch(jevEndpoint('/__jev/bootstrap'),{signal:AbortSignal.any([bootstrapController.signal,AbortSignal.timeout(8000)]),cache:'no-store'}).then(async response=>{
   if(!response.ok)throw Error('Initial view unavailable');const value=await response.json();
   if(value.kind!=='view'||!value.capture||!Array.isArray(value.capture.tokens))throw Error('Invalid initial view');
   const verified=createLiveSession().accept(200,{kind:'snapshot',capture:value.capture,revision:value.capture.captureId+':'+value.capture.captureHash});
   if(!stopped&&!bootStopped&&!session.current()){setCapture(verified);try{saveView(window.localStorage,value.capture);}catch{}}
  }).catch(()=>{}).finally(()=>{bootStopped=true;startFull();});
  return()=>{clearTimeout(startup);bootstrapController.abort();stopped=true;request?.abort();clearTimeout(timer);clearInterval(clock);};
 },[]);
 return trenches?<Suspense fallback={<div style={{padding:24,color:'#edf0f5',background:'#0b0d10',minHeight:'100vh'}}>Loading Trenches…</div>}><TrenchesWorkspace capture={capture} connectionError={error} viewOnly={viewOnly}/></Suspense>:<AttractorPreview capture={capture} connectionError={error} viewOnly={viewOnly}/>;
}
createRoot(document.getElementById('root')!).render(<App/>);
