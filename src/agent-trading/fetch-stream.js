// Headers and body have separate, bounded budgets. Time spent waiting for the
// server must not consume the time needed to transfer its compressed response.
export async function fetchStream(url,init={},budgets={}){
 const controller=new AbortController();let timer=setTimeout(()=>controller.abort(),budgets.headersMs??12000);
 try{
  const response=await fetch(url,{...init,signal:init.signal?AbortSignal.any([init.signal,controller.signal]):controller.signal});
  clearTimeout(timer);
  if(!response.ok&&response.status!==304)throw Error('Capture unavailable');
  const bytes=Number(response.headers.get('content-length'));
  const bodyMs=budgets.bodyMs??Math.min(30000,Math.max(12000,6000+bytes/100));
  timer=setTimeout(()=>controller.abort(),bodyMs);
  const text=response.status===304?'':await response.text();
  if(text.length>24000000)throw Error('Capture exceeds browser budget');
  return {response,text};
 }finally{clearTimeout(timer);}
}
