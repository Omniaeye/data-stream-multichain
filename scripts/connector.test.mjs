/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createConnector} from '../src/server/connector.mjs';
import {unpackLive} from '../src/agent-trading/live-wire.js';
function response(){return {status:0,headers:null,body:null,writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};}
const env={DATA_STREAM_UPSTREAM:'https://private.example',NEWS_STREAM_UPSTREAM:'https://private.example',JEV_GATEWAY_KEY:'test-only'};
test('only approved routes reach authenticated upstream; ETag avoids duplicate bodies',async()=>{
 let requests=0;const serve=createConnector(env,{fetchImpl:async(url,opts)=>{requests++;assert.equal(url.origin,'https://private.example');assert.equal(opts.headers.Authorization,'Bearer test-only');return new Response('{"links":[]}',{headers:{etag:'"v1"'}});}});
 const blocked=response();await serve({method:'GET',headers:{}},blocked,new URL('https://site/__jev/news?url=https://example.com'));assert.equal(blocked.status,400);assert.equal(requests,0);
 const success=response();await serve({method:'GET',headers:{}},success,new URL('https://site/__jev/news'));assert.equal(success.status,200);assert.equal(requests,1);
 const unchanged=response();await serve({method:'GET',headers:{'if-none-match':'"v1"'}},unchanged,new URL('https://site/__jev/news'));assert.equal(unchanged.status,304);assert.equal(unchanged.body,undefined);assert.equal(requests,1);
});
test('oversized upstream response fails without returning credentials',async()=>{
 const serve=createConnector(env,{maxBytes:8,fetchImpl:async()=>new Response('123456789')});const res=response();await serve({method:'GET',headers:{}},res,new URL('https://site/__jev/live'));assert.equal(res.status,503);assert.ok(!res.body.includes('test-only'));
});
test('missing credentials fail closed',async()=>{
 const serve=createConnector({...env,JEV_GATEWAY_KEY:''},{fetchImpl:()=>{throw Error('Must not call');}});const res=response();await serve({method:'GET',headers:{}},res,new URL('https://site/__jev/news'));assert.equal(res.status,503);
});
test('expired cached bodies revalidate upstream without retransmission or losing new clients',async()=>{
 let now=0,requests=0;
 const serve=createConnector(env,{clock:()=>now,fetchImpl:async(url,opts)=>{
  requests++;
  if(requests===1){assert.equal(opts.headers['If-None-Match'],undefined);return new Response('{"tokens":[1,2]}',{headers:{etag:'"v1"'}});}
  assert.equal(opts.headers['If-None-Match'],'"v1"');
  return new Response(null,{status:304,headers:{etag:'"v1"'}});
 }});
 const url=new URL('https://site/__jev/live?sync=1');
 const first=response();await serve({method:'GET',headers:{}},first,url);
 now=1000;
 const freshClient=response();await serve({method:'GET',headers:{'accept-encoding':'gzip'}},freshClient,url);
 assert.equal(requests,2);assert.equal(freshClient.status,200);
 assert.equal(gunzipSync(freshClient.body).toString(),'{"tokens":[1,2]}');
 const returning=response();await serve({method:'GET',headers:{'if-none-match':'"v1"'}},returning,url);
 assert.equal(returning.status,304);assert.equal(requests,2);
});
test('concurrent stale requests share revalidation and cannot forward an unowned validator',async()=>{
 let now=0,requests=0,release;const gate=new Promise(resolve=>{release=resolve;});
 const serve=createConnector(env,{clock:()=>now,fetchImpl:async(url,opts)=>{
  requests++;
  assert.equal(opts.headers['If-None-Match'],requests===1?undefined:'"v1"');
  if(requests===1)return new Response('{"version":1}',{headers:{etag:'"v1"'}});
  await gate;return new Response('{"version":2}',{headers:{etag:'"v2"'}});
 }});
 const url=new URL('https://site/__jev/live');
 await serve({method:'GET',headers:{'if-none-match':'"untrusted"'}},response(),url);
 now=1000;
 const responses=Array.from({length:50},response);
 const jobs=responses.map(res=>serve({method:'GET',headers:{'if-none-match':'"v1"'}},res,url));
 release();await Promise.all(jobs);
 assert.equal(requests,2);
 assert.ok(responses.every(res=>res.status===200&&res.headers.ETag==='"v2"'&&res.body.toString()==='{"version":2}'));
});
test('an upstream 304 without a retained representation fails closed',async()=>{
 const serve=createConnector(env,{fetchImpl:async()=>new Response(null,{status:304})});
 const res=response();await serve({method:'GET',headers:{'if-none-match':'"client-only"'}},res,new URL('https://site/__jev/live'));
 assert.equal(res.status,503);
});
test('the prepared view also warms the verified snapshot, which survives a slow refresh',async()=>{
 let now=0,reads=0,release;
 const gate=new Promise(resolve=>{release=resolve;});
 const snapshot=id=>({kind:'snapshot',revision:id+':hash',capture:{mode:'live',captureId:id,captureHash:'hash',receivedAt:'2026-09-28T12:00:00Z',tokens:[]}});
 const serve=createConnector(env,{clock:()=>now,fetchImpl:async()=>{if(++reads===1)return new Response(JSON.stringify(snapshot('a')),{headers:{etag:'"a"'}});await gate;return new Response(JSON.stringify(snapshot('b')),{headers:{etag:'"b"'}});}});
 await serve.warm();
 const url=new URL('https://site/__jev/live?sync=1&wire=1'),first=response();
 await serve({method:'GET',headers:{}},first,url);
 assert.equal(reads,1,'bootstrap must reuse its already downloaded full capture');
 assert.deepEqual(unpackLive(JSON.parse(first.body)),snapshot('a'));
 now=1000;
 const pending=response();
 try{
  await Promise.race([serve({method:'GET',headers:{'if-none-match':'"a"'}},pending,url),new Promise((_,reject)=>setTimeout(()=>reject(Error('cached data blocked by refresh')),100))]);
  assert.equal(pending.status,304);assert.equal(reads,2);
 }finally{release();}
 await new Promise(resolve=>setImmediate(resolve));
 const next=response();await serve({method:'GET',headers:{'if-none-match':'"a"'}},next,url);
 assert.equal(next.status,200);assert.deepEqual(unpackLive(JSON.parse(next.body)),snapshot('b'));
});
