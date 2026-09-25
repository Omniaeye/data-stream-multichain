/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
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
