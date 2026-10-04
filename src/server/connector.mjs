/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import {gzipSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
import {packLive} from '../agent-trading/live-wire.js';
import {createBootstrap} from './bootstrap.mjs';
export function createConnector(env,{fetchImpl=fetch,maxBytes=24*1024*1024,clock=Date.now,upstreamTimeoutMs=12000,failureCooldownMs=1000,onDiagnostic=event=>console.warn(JSON.stringify(event))}={}){
 const deadlineMs=Math.min(12000,Math.max(1,Number.isFinite(upstreamTimeoutMs)?upstreamTimeoutMs:12000));
 const cooldownMs=Math.min(5000,Math.max(0,Number.isFinite(failureCooldownMs)?failureCooldownMs:1000));
 const failures=new Map();
 function failed(key,event){failures.delete(key);failures.set(key,clock()+cooldownMs);while(failures.size>8)failures.delete(failures.keys().next().value);try{onDiagnostic(event);}catch{/* Diagnostics never change delivery. */}}
 const cache=new Map(),pending=new Map();let cachedBytes=0;
 const bootstrap=createBootstrap(env,{fetchImpl,clock,onSnapshot(message,etag){
  // Reuse the full capture already read to prepare the small initial view.
  const body=Buffer.from(JSON.stringify(packLive(message)));
  retain('/__jev/live?sync=1&wire=1',{body,compressed:gzipSync(body,{level:6}),etag,at:clock()});
 }});
 function retain(key,value){
  const old=cache.get(key);if(old)cachedBytes-=old.body.length+old.compressed.length;
  cache.delete(key);cache.set(key,value);cachedBytes+=value.body.length+value.compressed.length;
  while(cache.size>8||cachedBytes>32*1024*1024){const first=cache.keys().next().value,removed=cache.get(first);cache.delete(first);cachedBytes-=removed.body.length+removed.compressed.length;}
  return value;
 }
 function error(res,status,message,headers={}){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...headers});res.end(JSON.stringify({error:message}));}
 const serve=async(req,res,url)=>{
  if(req.method!=='GET')return error(res,405,'Method not allowed');
  if(url.pathname==='/__jev/bootstrap'){if(url.search)return error(res,400,'Unsupported request');return bootstrap.serve(req,res);}
  const origin=url.pathname==='/__jev/live'?env.DATA_STREAM_UPSTREAM:url.pathname==='/__jev/news'?env.NEWS_STREAM_UPSTREAM:url.pathname==='/__jev/trading'?env.DATA_STREAM_UPSTREAM:null;
  if(!['/__jev/live','/__jev/news','/__jev/trading'].includes(url.pathname))return error(res,404,'Not found');
  if(!origin||!env.JEV_GATEWAY_KEY)return error(res,503,'Connector unavailable');
  if(url.pathname==='/__jev/trading'&&(url.search.length>32||[...url.searchParams.keys()].some(k=>k!=='after')||url.searchParams.getAll('after').length>1||!/^\d{1,15}$/.test(url.searchParams.get('after')??'0')))return error(res,400,'Unsupported request');
  if(url.pathname!=='/__jev/trading'&&(url.search.length>320||url.pathname==='/__jev/news'&&url.search||[...url.searchParams.keys()].some(k=>!['sync','since','wire'].includes(k)||url.searchParams.getAll(k).length!==1)||url.searchParams.has('wire')&&(url.pathname!=='/__jev/live'||url.searchParams.get('wire')!=='1'||url.searchParams.get('sync')!=='1')||url.searchParams.has('sync')&&url.searchParams.get('sync')!=='1'||url.searchParams.has('since')&&!/^[a-zA-Z0-9:_-]{1,200}$/.test(url.searchParams.get('since'))))return error(res,400,'Unsupported request');
  // The journal treats an absent cursor and zero identically. Share that fill.
  const key=url.pathname==='/__jev/trading'?url.pathname+'?after='+String(Number(url.searchParams.get('after')??0)):url.pathname+url.search;
  const packed=url.searchParams.get('wire')==='1',upstreamUrl=new URL(key,origin);if(packed)upstreamUrl.searchParams.delete('wire');
  try{
   let item=cache.get(key);
   if(!item||clock()-item.at>=900){
    const coolingUntil=failures.get(key)??0;
    if(coolingUntil>clock()&&!(packed&&item))return error(res,503,'Connector temporarily unavailable',{'retry-after':String(Math.max(1,Math.ceil((coolingUntil-clock())/1000)))});
    if(!pending.has(key)&&coolingUntil<=clock()){
     if(pending.size>=8)return error(res,503,'Stream busy');
     const task=(async()=>{
      const controller=new AbortController(),startedAt=clock(),requestId=randomUUID(),timer=setTimeout(()=>controller.abort(),deadlineMs);let phase='fetch',sourceStatus=null;const failure=(kind)=>Object.assign(Error('Connector read failed'),{connectorKind:kind});
      try{
       const headers={accept:'application/json',Authorization:'Bearer '+env.JEV_GATEWAY_KEY,'accept-encoding':'identity'};
       // Revalidate only the representation retained for this exact query.
       // A browser validator alone cannot supply a body to another client.
       if(item?.etag)headers['If-None-Match']=item.etag;
       const upstream=await fetchImpl(upstreamUrl,{headers,signal:controller.signal,redirect:'error'});
       sourceStatus=upstream.status;
       if(upstream.status===304){
        if(!item?.etag)throw failure('missing_representation');
        failures.delete(key);return retain(key,{...item,etag:upstream.headers.get('etag')??item.etag,at:clock()});
       }
       if(!upstream.ok)throw failure('upstream_status');
       phase='body';let size=0;const chunks=[];
       for await(const chunk of upstream.body){size+=chunk.length;if(size>maxBytes){controller.abort();throw failure('response_budget');}chunks.push(chunk);}
       phase='pack';const raw=Buffer.concat(chunks),body=packed?Buffer.from(JSON.stringify(packLive(JSON.parse(raw.toString())))):raw;
       failures.delete(key);return retain(key,{body,compressed:gzipSync(body,{level:packed?6:1}),etag:upstream.headers.get('etag'),at:clock()});
      }catch(error){
       const kind=['missing_representation','upstream_status','response_budget'].includes(error?.connectorKind)?error.connectorKind:controller.signal.aborted?'deadline':error?.name==='SyntaxError'?'invalid_json':'read_failure';
       failed(key,{event:'jev_connector_failure',route:url.pathname,phase,kind,sourceStatus,elapsedMs:Math.max(0,clock()-startedAt),deadlineMs,requestId});throw error;
      }finally{clearTimeout(timer);}
     })().finally(()=>pending.delete(key));pending.set(key,task);
    }
    // A retained packed response stays usable while this exact cursor refreshes.
    // Its original timestamps still govern freshness in the browser.
    if(packed&&item)void pending.get(key)?.catch(()=>{});
    else item=await pending.get(key);
   }
   const headers={'content-type':'application/json','cache-control':'no-store','vary':'Accept-Encoding'};
   if(item.etag)headers.ETag=item.etag;
   if(item.etag&&req.headers['if-none-match']===item.etag){res.writeHead(304,headers);res.end();return;}
   const compressed=/\bgzip\b/.test(req.headers['accept-encoding']??'');if(compressed)headers['content-encoding']='gzip';
   const body=compressed?item.compressed:item.body;headers['content-length']=body.length;
   res.writeHead(200,headers);res.end(body);
  }catch{return error(res,503,'Connector temporarily unavailable');}
 };
 serve.warm=bootstrap.warm;return serve;
}

