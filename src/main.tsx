/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import {createRoot} from 'react-dom/client';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import {useEffect,useState} from 'react';
import type {Capture} from './agent-trading/AgentTradingJev';
import {AttractorPreview} from './agent-trading/AttractorPreview';
import {createLiveSession,retryDelay} from './agent-trading/live-sync';

function App(){
 const [capture,setCapture]=useState<Capture>(),[error,setError]=useState(false),[,setClock]=useState(0);
 useEffect(()=>{
  const session=createLiveSession();
  let stopped=false,timer:ReturnType<typeof setTimeout>,request:AbortController|undefined,failures=0;
  async function update(){
   // The next visible poll catches up from the server; hidden tabs do not build
   // a second ingestion history or accumulate stale animation cycles.
   if(document.hidden){timer=setTimeout(update,1000);return;}
   request=new AbortController();
   try{
    const revision=session.revision();
    const response=await fetch('/__jev/live?sync=1'+(revision?'&since='+encodeURIComponent(revision):''),{
     signal:AbortSignal.any([request.signal,AbortSignal.timeout(12000)]),cache:'no-store',
     headers:revision?{'If-None-Match':`"${revision}"`}:{}
    });
    let message;
    if(response.status!==304){
     if(!response.ok)throw Error('Capture unavailable');
     const text=await response.text();if(text.length>24000000)throw Error('Capture exceeds browser budget');
     message=JSON.parse(text);
    }
    const next=session.accept(response.status,message);
    if(!stopped){setCapture(next);setError(false);failures=0;}
   }catch{
    session.fail();if(!stopped){setError(true);failures++;}
   }
   if(!stopped)timer=setTimeout(update,failures?retryDelay(failures):1000);
  }
  // Freshness and scene eligibility must advance even on 304 responses.
  const clock=setInterval(()=>{if(!document.hidden)setClock(t=>t+1);},1000);
  void update();
  return()=>{stopped=true;request?.abort();clearTimeout(timer);clearInterval(clock);};
 },[]);
 return <AttractorPreview capture={capture} connectionError={error}/>;
}
createRoot(document.getElementById('root')!).render(<App/>);
