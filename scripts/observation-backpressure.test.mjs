import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrganismStore,RESIDENCE_SECONDS} from '../src/agent-trading/observation-organisms.js';
import {createStreamPacer} from '../src/agent-trading/stream-pacer.js';
const wall=Date.parse('2026-10-03T12:00:00Z');
function route(frame,count=128){const chain=['robinhood','bsc','solana'][frame%3];return {paced:true,rows:Array.from({length:count},(_,i)=>({id:frame+':'+i,captureId:String(frame),tokenKey:chain+':'+Math.floor(i/4),tokenName:String(Math.floor(i/4)),chain,zone:'market',changed:false,receivedAt:new Date(wall+frame*1000/60).toISOString(),field:{key:['buys','sells','swaps','volume'][i%4],value:i}})),presentation:{cycleId:String(Math.floor(frame/900)),startsAt:new Date(wall+frame*1000/60).toISOString(),durationMs:16}};}

test('queue rejection is explicit and atomic; retry accepts the original evidence exactly once',()=>{
 const store=createOrganismStore([],4,{residenceSeconds:RESIDENCE_SECONDS,pacedSpreadSeconds:.12,maxQueued:4});
 store.ingest(route(0,4));assert.equal(store.canAccept(1),false);const before=store.stats(0),next=route(1,1);
 assert.throws(()=>store.ingest(next),error=>error.name==='ObservationQueueFullError'&&error.requested===1&&error.available===0);
 assert.deepEqual(store.stats(0),before);assert.equal(store.get(next.rows[0].id),null);
 store.advance(0);assert.equal(store.canAccept(1),true);const accepted=store.ingest(next);assert.equal(accepted.length,1);assert.equal(accepted[0],next.rows[0]);
 assert.equal(store.ingest(next).length,0);assert.equal(store.stats(0).received,5);
});

test('sixty seconds of CPU queue overload remain bounded and drain without duplicate effects',()=>{
 const store=createOrganismStore([],24576,{residenceSeconds:RESIDENCE_SECONDS,pacedSpreadSeconds:.12,maxQueued:8192}),pacer=createStreamPacer(),accepted=new Set();
 let maxCpuQueued=0,maxPacerPending=0,maxRetained=0,maxLogicalRecords=0,blocked=0,input=0;
 function step(frame,add){const now=frame*1000/60;if(add){const r=route(frame);input+=r.rows.length;pacer.add(r,now,[],wall+now);}
  // This is the exact integration guard requested at AttractorPreview.
  if(store.canAccept(128)){const rows=pacer.take(now,wall+now).flatMap(g=>g.rows);const admitted=store.ingest({rows,paced:true});assert.equal(admitted.length,rows.length);for(const datum of admitted){assert.equal(accepted.has(datum.id),false);accepted.add(datum.id);}}
  else blocked++;
  if(frame%6===0)store.advance(frame/60);
  const stats=store.stats(frame/60);maxCpuQueued=Math.max(maxCpuQueued,stats.queued);maxPacerPending=Math.max(maxPacerPending,pacer.stats().pending);maxRetained=Math.max(maxRetained,stats.retained);maxLogicalRecords=Math.max(maxLogicalRecords,stats.retained+stats.queued);
  assert.ok(stats.queued<=8192);assert.ok(stats.retained<=24576);assert.ok(pacer.stats().pending<=65536);assert.equal(input,stats.received+pacer.stats().pending+pacer.stats().superseded);
 }
 for(let frame=0;frame<3600;frame++)step(frame,true);
 assert.ok(blocked>0,'the synthetic input must exceed renderer admission throughput');
 let frame=3600;for(;frame<9000;frame++){step(frame,false);const stats=store.stats(frame/60);if(!pacer.stats().pending&&!stats.pending&&!stats.inFlight&&stats.delivered===stats.received)break;}
 assert.ok(frame<9000,'all remaining presentation work must recover after the input stops');
 const stats=store.stats(frame/60);assert.equal(stats.received,accepted.size);assert.equal(stats.delivered,stats.received);assert.equal(stats.queued,0);assert.equal(pacer.stats().pending,0);assert.equal(input,stats.received+pacer.stats().superseded);
 console.log(JSON.stringify({synthetic:true,input,accepted:accepted.size,superseded:pacer.stats().superseded,maxCpuQueued,maxPacerPending,maxRetained,maxLogicalRecords,blockedTicks:blocked,drainedAtSeconds:+(frame/60).toFixed(2)}));
});
