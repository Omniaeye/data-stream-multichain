import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import type {Capture} from './AgentTradingJev';
import {AttractorPreview} from './AttractorPreview';
import {applyEnvelope,revisionOf,retryDelay} from './live-sync';
function LivePreview(){
 const [capture,setCapture]=useState<Capture>(),[error,setError]=useState(false),[,setClock]=useState(0);
 useEffect(()=>{
  let stopped=false,timer:ReturnType<typeof setTimeout>,request:AbortController|undefined,current:Capture|undefined,failures=0,reset=false;
  async function update(){
   request=new AbortController();const deadline=setTimeout(()=>request?.abort(),12000);
   try{
    const revision=current&&!reset?revisionOf(current):undefined;
    const response=await fetch('/__jev/live?sync=1'+(revision?'&since='+encodeURIComponent(revision):''),{signal:request.signal,cache:'no-store',headers:revision?{'If-None-Match':`"${revision}"`}:{}});
    if(response.status!==304){
     if(!response.ok)throw new Error('Source unavailable');
     const text=await response.text();if(text.length>24000000)throw new Error('Projection exceeds budget');
     let next:Capture;try{next=applyEnvelope(current,JSON.parse(text));}catch{reset=true;throw new Error('Resync required');}
     if(!stopped){current=next;setCapture(next);reset=false;}
    }else if(!revision)throw new Error('Unexpected unchanged response');
    if(!stopped){setError(false);failures=0;}
   }catch{if(!stopped){setError(true);failures++;}}
   finally{clearTimeout(deadline);}
   // Local ETag checks only; provider collection remains six requests per 15s.
   if(!stopped){setClock(Date.now());timer=setTimeout(update,failures?retryDelay(failures):1000);}
  }
  const clock=setInterval(()=>setClock(Date.now()),1000);
  void update();return()=>{stopped=true;request?.abort();clearTimeout(timer);clearInterval(clock);};
 },[]);
 return <AttractorPreview capture={capture} connectionError={error}/>;
}
createRoot(document.getElementById('root')!).render(<LivePreview/>);
