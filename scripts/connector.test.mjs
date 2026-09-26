/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createConnector} from '../src/server/connector.mjs';
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
