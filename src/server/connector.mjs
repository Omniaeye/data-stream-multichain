/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import {gzipSync} from 'node:zlib';
export function createConnector(env,{fetchImpl=fetch,maxBytes=24*1024*1024}={}){
 const cache=new Map(),pending=new Map();let cachedBytes=0;
 function error(res,status,message){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:message}));}
 return async(req,res,url)=>{
  if(req.method!=='GET')return error(res,405,'Method not allowed');
  const origin=url.pathname==='/__jev/live'?env.DATA_STREAM_UPSTREAM:url.pathname==='/__jev/news'?env.NEWS_STREAM_UPSTREAM:null;
  if(!['/__jev/live','/__jev/news'].includes(url.pathname))return error(res,404,'Not found');
  if(!origin||!env.JEV_GATEWAY_KEY)return error(res,503,'Connector unavailable');
  if(url.search.length>300||url.pathname==='/__jev/news'&&url.search||[...url.searchParams.keys()].some(k=>!['sync','since'].includes(k)||url.searchParams.getAll(k).length!==1)||url.searchParams.has('sync')&&url.searchParams.get('sync')!=='1'||url.searchParams.has('since')&&!/^[a-zA-Z0-9:_-]{1,200}$/.test(url.searchParams.get('since')))return error(res,400,'Unsupported request');
  const key=url.pathname+url.search;
  try{
   let item=cache.get(key);
   if(!item||Date.now()-item.at>=900){
    if(!pending.has(key)){
     if(pending.size>=8)return error(res,503,'Stream busy');
     const task=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      try{
       const upstream=await fetchImpl(new URL(key,origin),{headers:{accept:'application/json',Authorization:'Bearer '+env.JEV_GATEWAY_KEY,'accept-encoding':'identity'},signal:controller.signal,redirect:'error'});
       if(!upstream.ok)throw Error('Source unavailable');
       let size=0;const chunks=[];
       for await(const chunk of upstream.body){size+=chunk.length;if(size>maxBytes){controller.abort();throw Error('Response too large');}chunks.push(chunk);}
       const body=Buffer.concat(chunks),value={body,compressed:gzipSync(body,{level:1}),etag:upstream.headers.get('etag'),at:Date.now()};
       const old=cache.get(key);if(old)cachedBytes-=old.body.length+old.compressed.length;
       cache.delete(key);cache.set(key,value);cachedBytes+=body.length+value.compressed.length;
       while(cache.size>8||cachedBytes>32*1024*1024){const first=cache.keys().next().value,removed=cache.get(first);cache.delete(first);cachedBytes-=removed.body.length+removed.compressed.length;}
       return value;
      }finally{clearTimeout(timer);}
     })().finally(()=>pending.delete(key));pending.set(key,task);
    }
    item=await pending.get(key);
   }
   const headers={'content-type':'application/json','cache-control':'no-store','vary':'Accept-Encoding'};
   if(item.etag)headers.ETag=item.etag;
   if(item.etag&&req.headers['if-none-match']===item.etag){res.writeHead(304,headers);res.end();return;}
   const compressed=/\bgzip\b/.test(req.headers['accept-encoding']??'');if(compressed)headers['content-encoding']='gzip';
   res.writeHead(200,headers);res.end(compressed?item.compressed:item.body);
  }catch{return error(res,503,'Connector temporarily unavailable');}
 };
}
