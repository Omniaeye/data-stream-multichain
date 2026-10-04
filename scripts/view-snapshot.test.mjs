import test from 'node:test';import assert from 'node:assert/strict';
import {makeViewCapture,readView,saveView,VIEW_KEY} from '../src/agent-trading/view-snapshot.js';
import {createBootstrap} from '../src/server/bootstrap.mjs';
const at=Date.parse('2026-09-28T12:00:00Z');
const capture={mode:'live',captureId:'capture',captureHash:'hash',receivedAt:new Date(at).toISOString(),tokens:[{id:'a',chain:'bsc',name:'A',fields:[{key:'market_cap',value:20000,id:'m',path:'/market_cap'},{key:'holders',value:17,id:'h',path:'/holders'}]}],batches:[{captureId:'raw'}],delivery:{epoch:'old'}};
test('restored view has no batches or delivery cursor and expires without changing evidence time',()=>{
 let value=null;const storage={setItem:(key,v)=>value=v,getItem:()=>value};saveView(storage,capture,at);
 const restored=readView(storage,at+1000);assert.ok(restored);assert.equal(restored.batches,undefined);assert.equal(restored.delivery,undefined);assert.equal(restored.receivedAt,capture.receivedAt);assert.equal(restored.tokens[0].fields.length,1);assert.equal(readView(storage,at+301000),undefined);
 value='{';assert.equal(readView(storage,at),undefined);assert.equal(capture.tokens[0].fields.length,2);
});
test('simultaneous new viewers share the prepared initial view and never receive raw batches',async()=>{
 let reads=0;const bootstrap=createBootstrap({DATA_STREAM_UPSTREAM:'https://source.invalid',JEV_GATEWAY_KEY:'fixture'},{clock:()=>at,fetchImpl:async()=>{reads++;await new Promise(r=>setTimeout(r,5));return new Response(JSON.stringify({kind:'snapshot',capture}),{headers:{etag:'"v1"'}});}});
 const outputs=await Promise.all(Array.from({length:5},async()=>{const res={writeHead(status,headers){this.status=status;},end(body){this.body=body;}};await bootstrap.serve({headers:{}},res);return res;}));
 assert.equal(reads,1);for(const res of outputs){assert.equal(res.status,200);assert.equal(JSON.parse(res.body).capture.batches,undefined);}
});
