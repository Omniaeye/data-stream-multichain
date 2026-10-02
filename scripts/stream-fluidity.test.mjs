import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreamPacer} from '../src/agent-trading/stream-pacer.js';
import {createOrganismStore,RESIDENCE_SECONDS,JOURNEY_SECONDS,organismStage} from '../src/agent-trading/observation-organisms.js';
const wall=Date.parse('2026-10-03T12:00:00Z');
function rows(chain,count,cycle='1') {return Array.from({length:count},(_,i)=>({id:`${cycle}:${chain}:${i}`,captureId:cycle,tokenKey:`${chain}:${i}`,tokenName:String(i),chain,zone:'Market',receivedAt:new Date(wall).toISOString(),field:{key:'price',value:i}}));}

test('a late presentation frame is bounded and fairly serves all three source networks',()=>{
 const pacer=createStreamPacer();
 const original=['robinhood','bsc','solana'].flatMap(chain=>rows(chain,400));
 pacer.add({rows:original,presentation:{cycleId:'one',startsAt:new Date(wall).toISOString(),durationMs:15000}},0,[],wall);
 const first=pacer.take(300000,wall+300000);
 assert.ok(first.length<=32,'a slow frame must not flush every due group into the GPU');
 assert.deepEqual([...new Set(first.map(g=>g.chain))].sort(),['bsc','robinhood','solana']);
 const delivered=[...first];while(pacer.stats().pending)delivered.push(...pacer.take(300000,wall+300000));
 assert.equal(new Set(delivered.flatMap(g=>g.rows.map(r=>r.id))).size,original.length);
 assert.equal(pacer.stats().shown,original.length);
 assert.equal(pacer.stats().superseded,0);
 assert.ok(delivered.every(g=>g.rows.every(r=>r.receivedAt===new Date(wall).toISOString())));
 const empty=pacer.stats();assert.deepEqual(pacer.take(600000,wall+600000),[]);assert.deepEqual(pacer.stats(),empty);
});

test('legacy capture queues are bounded too and supersession is explicitly accounted for',()=>{
 const pacer=createStreamPacer({maxPendingFields:128,maxGroupsPerTake:6});
 for(let i=0;i<20;i++)pacer.add({rows:['robinhood','bsc','solana'].flatMap(chain=>rows(chain,30,String(i)))},i*15000,[],wall+i*15000);
 assert.ok(pacer.stats().pending<=128,'absence of presentation metadata must not accumulate unbounded animation history');
 const delivered=[];while(pacer.stats().pending)delivered.push(...pacer.take(1000000,wall+1000000));
 assert.ok(pacer.stats().superseded>0);
 assert.equal(pacer.stats().received,pacer.stats().shown+pacer.stats().superseded);
 assert.equal(new Set(delivered.flatMap(g=>g.rows.map(r=>r.id))).size,pacer.stats().shown);
});

test('real observations remain resident through a five minute capture gap without new receipts or deliveries',()=>{
 const store=createOrganismStore(['bsc:0'],4,{residenceSeconds:RESIDENCE_SECONDS,pacedSpreadSeconds:0});
 const observation=rows('bsc',1)[0];store.ingest({rows:[observation],paced:true});store.advance(0);
 const record=store.get(observation.id),birth=record.birth;
 store.advance(JOURNEY_SECONDS+1);const before=store.stats(JOURNEY_SECONDS+1);
 for(let t=10;t<=300;t+=10)store.advance(t);
 assert.equal(store.get(observation.id),record,'resident organisms must survive provider cooldown');
 assert.equal(record.birth,birth);assert.equal(record.datum,observation);assert.equal(organismStage(record,300),'resident');
 const after=store.stats(300);assert.equal(after.received,before.received);assert.equal(after.delivered,before.delivered);assert.equal(after.pending,0);
 store.ingest({rows:[observation],paced:true});store.advance(301);assert.equal(store.stats(301).received,1);
});

test('persistent residency still retires old clouds under capacity pressure after their true journey completes',()=>{
 const store=createOrganismStore(['bsc:0','bsc:1'],1,{residenceSeconds:RESIDENCE_SECONDS,pacedSpreadSeconds:0});
 store.ingest({rows:rows('bsc',2),paced:true});store.advance(0);
 assert.equal(store.stats(0).retained,1);assert.equal(store.stats(0).pending,1);
 store.advance(JOURNEY_SECONDS+1);
 assert.equal(store.stats(JOURNEY_SECONDS+1).retained,1);assert.equal(store.stats(JOURNEY_SECONDS+1).retired,1);assert.equal(store.stats(JOURNEY_SECONDS+1).received,2);
 assert.equal(store.get('1:bsc:0'),null);assert.ok(store.get('1:bsc:1'));
});

test('frame telemetry is bounded and identifies actual late frames without inventing GPU time',async()=>{
 const {createFrameTiming}=await import('../src/agent-trading/frame-timing.js');
 const timing=createFrameTiming(4);[16,17,16,80,120].forEach(value=>timing.sample(value));
 assert.deepEqual(timing.stats(),{frames:4,p50:80,p90:120,p99:120,max:120,longFrames:2});
 timing.sample(NaN);timing.sample(0);assert.equal(timing.stats().frames,4);
 timing.reset();assert.equal(timing.stats().frames,0);assert.equal(timing.stats().longFrames,0);
});
