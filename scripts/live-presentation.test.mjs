/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreamPacer} from '../src/agent-trading/stream-pacer.js';
import {createLiveSession} from '../src/agent-trading/live-sync.js';
import {sceneAnchors} from '../src/agent-trading/scene-anchors.js';
import {timelineBounds} from '../src/agent-trading/token-timeline.js';
import {globalBounds} from '../src/agent-trading/token-global-layout.js';

const wall=Date.parse('2026-09-25T12:00:00Z');
const cycle=i=>({rows:Array.from({length:150},(_,j)=>({id:`${i}:${j}`,captureId:String(i),tokenKey:`bsc:${j%10}`,chain:'bsc',field:{key:'price',value:j},receivedAt:new Date(wall+i*15000).toISOString()})),presentation:{cycleId:String(i),startsAt:new Date(wall+i*15000).toISOString(),durationMs:15000}});

test('a long pause with continuing captures resumes recent cycles without accumulating history',()=>{
 const p=createStreamPacer();p.add(cycle(0),0,[],wall);
 for(let second=1;second<=300;second++){
  p.defer(1000);if(second%15===0)p.add(cycle(second/15),second*1000,[],wall+second*1000);
 }
 assert.ok(p.stats().pending<=300,'only two current presentation windows may wait');
 p.resume(300000);
 const buckets=[];for(let at=301000;at<=315000;at+=1000)buckets.push(p.take(at,wall+at).flatMap(g=>g.rows));
 const shown=buckets.flat();
 assert.ok(buckets.every(rows=>rows.length>0&&rows.length<=12));
 assert.equal(shown.length,150);assert.ok(shown.every(row=>Number(row.captureId)===20));
 assert.equal(p.stats().pending,0);
 assert.equal(p.stats().received,p.stats().shown+p.stats().superseded);
});

test('background reset keeps receipt identities but resumes a new cycle at current time',()=>{
 const p=createStreamPacer();p.add(cycle(0),0,[],wall);p.resetWindow();
 p.add(cycle(0),300000,[],wall+300000);assert.equal(p.stats().pending,0);
 p.add(cycle(20),300000,[],wall+300000);
 const buckets=[];for(let at=301000;at<=315000;at+=1000)buckets.push(p.take(at,wall+at).flatMap(g=>g.rows));
 assert.ok(buckets.every(rows=>rows.length>0&&rows.length<=12));
 assert.equal(buckets.flat().length,150);assert.equal(p.stats().pending,0);
});

test('a short pause without newer captures preserves every field and its receipt time',()=>{
 const p=createStreamPacer(),route=cycle(0);p.add(route,0,[],wall);
 const before=p.take(1000).flatMap(g=>g.rows);p.defer(60000);
 assert.equal(p.take(61000).length,0);
 const after=p.take(75000).flatMap(g=>g.rows);
 assert.deepEqual([...before,...after].map(r=>r.id).sort(),route.rows.map(r=>r.id).sort());
 assert.ok([...before,...after].every(r=>r.receivedAt===route.rows[0].receivedAt));
});

test('bad deltas retain the last capture and force a full snapshot recovery',()=>{
 const session=createLiveSession(),capture={mode:'live',captureId:'one',captureHash:'hash',tokens:[]};
 assert.throws(()=>session.accept(304),/snapshot/i);
 assert.equal(session.revision(),undefined);
 assert.equal(session.accept(200,{kind:'snapshot',revision:'one:hash',capture}),capture);
 assert.equal(session.revision(),'one:hash');
 assert.throws(()=>session.accept(200,{kind:'delta',base:'missing'}),/Revision gap/);
 assert.equal(session.revision(),undefined);assert.equal(session.current(),capture);
 session.accept(200,{kind:'snapshot',revision:'two:hash',capture:{...capture,captureId:'two'}});
 assert.equal(session.revision(),'two:hash');assert.equal(session.accept(304),session.current());
});

test('compact source marks clear the news and brain, including both token layouts',()=>{
 for(const [width,height,newsBottom] of [[320,640,145],[390,844,201],[705,836,214],[705,640,151]]){
  const a=sceneAnchors(width,height,true);
  assert.ok(a.ports.every(([,y])=>y-24>=newsBottom+8),`${width}: news overlaps a source`);
  assert.ok(a.ports.every(([,y])=>y+27<a.origin[1]-a.brainWidth*.37));
  const footer=a.origin[1]+a.brainWidth*.64;
  assert.ok(globalBounds(width,height,true,[])[0].y>=footer+30);
  assert.ok(timelineBounds(width,height,true,[])[0].y-48>=footer+16);
 }
});
