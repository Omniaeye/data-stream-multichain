import test from 'node:test';import assert from 'node:assert/strict';
import {packLive,unpackLive} from '../src/agent-trading/live-wire.js';
const token={id:'a',chain:'bsc',name:'A',fields:[{id:'field',group:'Market',key:'market_cap',value:20000,path:'/data/rank/0/market_cap'}],evidence:{captureId:'raw',captureHash:'hash'},observationMetadata:{endpoint:'market_rank'}};
const capture={mode:'live',captureId:'combined',captureHash:'hash2',tokens:[token],batches:[{mode:'live',captureId:'raw',captureHash:'hash',tokens:[token]}]};
test('packing preserves snapshot/delta fields, identities and evidence exactly',()=>{
 for(const message of [{kind:'snapshot',capture,revision:'combined:hash2'},{kind:'delta',base:'old:h',revision:'combined:hash2',metadata:{...capture,tokens:undefined},upsert:[token],remove:[],order:['bsc:a']}]){
  const json=JSON.parse(JSON.stringify(message));assert.deepEqual(unpackLive(JSON.parse(JSON.stringify(packLive(json)))),json);
 }
});
test('invalid compact references are rejected without changing the accepted session',async()=>{
 const {createLiveSession}=await import('../src/agent-trading/live-sync.js');
 const session=createLiveSession(),message={kind:'snapshot',capture,revision:'combined:hash2'};
 session.accept(200,message);
 const wire=packLive(message);wire.message.capture.tokens=[99999];
 assert.throws(()=>session.accept(200,unpackLive(wire)),/Invalid stream reference/);
 assert.equal(session.current(),capture);
 assert.equal(session.revision(),'combined:hash2');
});
