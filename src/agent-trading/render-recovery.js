// Owns renderer lifetime only. Capture/session state stays outside recovery.
export function createRenderRecovery({start,stop,onState=()=>{},active=()=>true,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}){
 let state='idle',generation=0,failures=0,fallback=false,timer=null,healthySince=null,lastFrame=0,lastPoll=now();
 const snapshot=()=>({state,generation,failures,fallback});
 const emit=()=>onState(snapshot());
 const current=id=>id===generation&&(state==='initializing'||state==='ready');
 const recovery={
  snapshot,current,isReady:()=>state==='ready',
  start(){
   if(state!=='idle'||!active())return;
   state='initializing';generation++;healthySince=null;lastFrame=lastPoll=now();emit();
   try{start(generation,fallback);}catch(error){recovery.fail(generation,error);}
  },
  frame(id){
   if(!current(id))return;
   lastFrame=now();healthySince??=lastFrame;
   if(state!=='ready'){state='ready';emit();}
   if(now()-healthySince>=15000)failures=0;
  },
  fail(id,error){
   if(!current(id))return false;
   state='waiting';failures++;fallback||=failures>=2;healthySince=null;emit();
   stop(error);
   timer=schedule(()=>{timer=null;if(state==='disposed')return;state='idle';recovery.start();},Math.min(30000,500*2**Math.min(failures-1,6)));
   return true;
  },
  poll(watch=true){
   const time=now(),suspended=time-lastPoll>2500;lastPoll=time;
   // A suspended main thread delays the watchdog too; allow frames to resume.
   if(!active()||!watch||suspended){lastFrame=time;healthySince=null;return;}
   if(state==='idle')recovery.start();
   else if(state==='initializing'&&now()-lastFrame>15000)recovery.fail(generation,new Error('Renderer initialization timed out'));
   else if(state==='ready'&&now()-lastFrame>3000)recovery.fail(generation,new Error('Renderer heartbeat stopped'));
  },
  dispose(){if(state==='disposed')return;state='disposed';generation++;if(timer!==null)cancel(timer);timer=null;stop();}
 };
 return recovery;
}
