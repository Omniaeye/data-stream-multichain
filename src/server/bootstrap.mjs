import {gzipSync} from 'node:zlib';
import {makeViewCapture} from '../agent-trading/view-snapshot.js';
export function createBootstrap(env,{fetchImpl=fetch,clock=Date.now,onSnapshot=()=>{}}={}){
 let cached,pending,etag,checkedAt=0;
 async function refresh(){
  if(pending)return pending;
  pending=(async()=>{
   if(!env.DATA_STREAM_UPSTREAM||!env.JEV_GATEWAY_KEY)throw Error('Bootstrap unavailable');
   const response=await fetchImpl(new URL('/__jev/live?sync=1',env.DATA_STREAM_UPSTREAM),{headers:{Authorization:'Bearer '+env.JEV_GATEWAY_KEY,accept:'application/json',...(etag?{'if-none-match':etag}:{})},signal:AbortSignal.timeout(12000),redirect:'error'});
   if(response.status===304&&cached){checkedAt=clock();return cached;}
   if(!response.ok)throw Error('Bootstrap unavailable');
   let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>24000000)throw Error('Bootstrap budget');chunks.push(chunk);}
   const message=JSON.parse(Buffer.concat(chunks).toString());if(message.kind!=='snapshot')throw Error('Bootstrap requires snapshot');
   const body=Buffer.from(JSON.stringify({kind:'view',capture:makeViewCapture(message.capture)}));
   if(body.length>2500000)throw Error('View budget');
   cached={body,compressed:gzipSync(body,{level:6})};etag=response.headers.get('etag');checkedAt=clock();onSnapshot(message,etag);return cached;
  })().finally(()=>pending=undefined);return pending;
 }
 return {warm:refresh,async serve(req,res){
  try{if(!cached)await refresh();else if(clock()-checkedAt>15000)void refresh().catch(()=>{});
   const compressed=/\bgzip\b/.test(req.headers['accept-encoding']??''),body=compressed?cached.compressed:cached.body;
   res.writeHead(200,{'content-type':'application/json','cache-control':'no-store','vary':'Accept-Encoding',...(compressed?{'content-encoding':'gzip'}:{})});res.end(body);
  }catch{res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end('{"error":"View unavailable"}');}
 }};
}
