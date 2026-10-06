import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createConnector} from '../src/server/connector.mjs';
import {chainMark} from '../src/agent-trading/network-marks.js';
function response(){return {status:0,headers:{},body:null,writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};}
const env={DATA_STREAM_UPSTREAM:'https://private.example',NEWS_STREAM_UPSTREAM:'https://private.example',JEV_GATEWAY_KEY:'test-only-secret'};
const req={method:'GET',headers:{}};
test('absent, zero and leading-zero journal cursors share one authenticated fill',async()=>{
 let reads=0;const serve=createConnector(env,{fetchImpl:async(url,opts)=>{reads++;assert.equal(url.pathname+url.search,'/__jev/trading?after=0');assert.equal(opts.headers.Authorization,'Bearer test-only-secret');return new Response('{"sequence":7,"mode":"presentation","ordersEnabled":false}');}});
 for(const query of ['', '?after=0','?after=000']){const res=response();await serve(req,res,new URL('https://site/__jev/trading'+query));assert.equal(res.status,200);assert.equal(JSON.parse(res.body).ordersEnabled,false);}
 assert.equal(reads,1);
});
test('failed upstream read enters bounded cooldown; no stale successful journal response',async()=>{
 let now=0,reads=0;const logs=[];const serve=createConnector(env,{clock:()=>now,onDiagnostic:event=>logs.push(event),fetchImpl:async()=>{reads++;if(reads===1)throw Error('Bearer test-only-secret should never be logged');return new Response('{"mode":"presentation","ordersEnabled":false}');}});
 const url=new URL('https://site/__jev/trading?after=0'),first=response(),cooling=response();await serve(req,first,url);await serve(req,cooling,url);
 assert.equal(first.status,503);assert.equal(cooling.status,503);assert.equal(cooling.headers['retry-after'],'1');assert.equal(reads,1);assert.equal(logs.length,1);assert.equal(logs[0].kind,'read_failure');assert.equal(logs[0].route,'/__jev/trading');assert.equal(logs[0].deadlineMs,12000);assert.ok(!JSON.stringify(logs).includes('test-only-secret'));assert.ok(!JSON.stringify(logs).includes('private.example'));
 now=1001;const recovered=response();await serve(req,recovered,url);assert.equal(recovered.status,200);assert.equal(reads,2);
});
test('deadline abort is classified and never returns a successful empty journal',async()=>{
 const logs=[];const serve=createConnector(env,{upstreamTimeoutMs:10,onDiagnostic:event=>logs.push(event),fetchImpl:async(_url,{signal})=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});})});
 const res=response();await serve(req,res,new URL('https://site/__jev/trading?after=0'));assert.equal(res.status,503);assert.equal(logs.length,1);assert.equal(logs[0].kind,'deadline');assert.equal(logs[0].phase,'fetch');assert.equal(logs[0].deadlineMs,10);assert.ok(logs[0].elapsedMs>=0);assert.match(logs[0].requestId,/^[a-f0-9-]{36}$/);
});
test('body budget and upstream status are distinguished without provider error text',async()=>{
 const logs=[];const budget=createConnector(env,{maxBytes:2,onDiagnostic:event=>logs.push(event),fetchImpl:async()=>new Response('123')});const res=response();await budget(req,res,new URL('https://site/__jev/news'));assert.equal(res.status,503);assert.equal(logs[0].kind,'response_budget');assert.equal(logs[0].phase,'body');
 const status=createConnector(env,{onDiagnostic:event=>logs.push(event),fetchImpl:async()=>new Response('private failure body',{status:429})});await status(req,response(),new URL('https://site/__jev/news'));assert.equal(logs[1].kind,'upstream_status');assert.equal(logs[1].sourceStatus,429);assert.ok(!JSON.stringify(logs).includes('private failure body'));
});
test('Solana alias resolves an existing canonical mark; unknown chains never become paths',()=>{
 assert.equal(chainMark('sol'),'/chain-marks/solana.svg');assert.equal(chainMark(' Solana '),'/chain-marks/solana.svg');assert.equal(chainMark('Robinhood Chain'),'/chain-marks/robinhood.jpg');assert.equal(chainMark('BSC'),'/chain-marks/bsc.svg');for(const network of ['sol','solana','bsc','robinhood'])assert.ok(fs.existsSync(new URL('../public'+chainMark(network),import.meta.url)));assert.ok(chainMark('../../.env').startsWith('data:image/svg+xml,'));
});
test('stream labels distinguish network transport, per-source age and local view',()=>{
 const metrics=fs.readFileSync(new URL('../src/agent-trading/StreamMetrics.tsx',import.meta.url),'utf8');
 const expr=metrics.match(/textContent=(connectionError\?'Reconnecting'.*);/)[1];
 const label=new Function('connectionError','viewOnly','stale','partial','captureStale','freshness','delivered','elapsed','elapsedLabel','return '+expr),known={items:[{}]},unknown={items:[]};
 assert.equal(label(false,false,false,false,true,known,1,20,String),'\u0394 20');
 assert.equal(label(true,false,false,false,false,known,1,20,String),'Reconnecting');
 assert.equal(label(false,true,false,false,false,known,null,20,String),'Syncing');
 assert.equal(label(false,false,true,false,false,known,1,20,String),'Stale');
 assert.equal(label(false,false,false,true,false,known,1,20,String),'Partial');
 assert.equal(label(false,false,false,false,false,known,1,20,String),'\u0394 20');
 assert.equal(label(false,false,false,false,false,known,null,20,String),'Waiting');
 assert.equal(label(false,false,false,false,true,unknown,1,20,String),'Waiting');
 const attractor=fs.readFileSync(new URL('../src/agent-trading/AttractorPreview.tsx',import.meta.url),'utf8');
 assert.ok(attractor.includes('connectionError={connectionError} captureStale={sceneClock.stale} viewOnly={viewOnly}'));
 assert.ok(attractor.includes('const delayed=connectionError||sceneClock.stale||viewOnly;'));
});

test('foreign error metadata cannot enter diagnostics; null failures stay sanitized',async()=>{
 for(const error of [Object.assign(Error('secret body'),{connectorKind:'Bearer provider-secret'}),null]){
  const logs=[],serve=createConnector(env,{onDiagnostic:e=>logs.push(e),fetchImpl:async()=>{throw error;}}),res=response();await serve(req,res,new URL('https://site/__jev/news'));assert.equal(res.status,503);assert.equal(logs[0].kind,'read_failure');assert.ok(!JSON.stringify(logs).includes('provider-secret'));assert.ok(!JSON.stringify(logs).includes('secret body'));
 }
});
