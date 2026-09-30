import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderRecovery} from '../src/agent-trading/render-recovery.js';

function harness(){
 let time=0,visible=true,nextId=0;
 const timers=new Map(),starts=[],stops=[];
 const r=createRenderRecovery({
  start:(generation,fallback)=>starts.push({generation,fallback,at:time}),
  stop:error=>stops.push(error?.message??'disposed'),
  active:()=>visible,now:()=>time,
  schedule:(fn,ms)=>{const id=++nextId;timers.set(id,{fn,at:time+ms});return id;},
  cancel:id=>timers.delete(id)
 });
 return {r,starts,stops,timers,visible:value=>{visible=value;},
  advance(ms){const end=time+ms;for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;timers.delete(next[0]);time=next[1].at;next[1].fn();}time=end;}
 };
}

test('a visible renderer with no successful frames is rebuilt after its heartbeat stops',()=>{
 const h=harness();h.r.start();h.r.frame(1);
 for(let i=0;i<4;i++){h.advance(1000);h.r.poll();}h.advance(500);
 assert.equal(h.starts.length,2,'a stopped animation loop must restart without a page reload');
 assert.equal(h.r.isReady(),false);
 h.r.frame(2);assert.equal(h.r.isReady(),true);
});

test('hidden or explicitly paused scenes do not trigger a stalled-frame restart',()=>{
 const h=harness();h.r.start();h.r.frame(1);
 h.visible(false);h.advance(60000);h.r.poll();
 h.visible(true);h.r.poll();assert.equal(h.starts.length,1);
 h.advance(500);h.r.frame(1);
 h.advance(60000);h.r.poll(false);h.r.poll(true);
 assert.equal(h.starts.length,1);assert.equal(h.r.isReady(),true);
});

test('persistent errors back off, switch backend and cannot be bypassed by arriving captures',()=>{
 const h=harness();h.r.start();
 for(let i=1;i<=9;i++){
  assert.equal(h.r.fail(i,new Error('persistent')),true);
  for(let j=0;j<100;j++)h.r.start();
  assert.equal(h.starts.length,i);assert.equal(h.timers.size,1);
  const delay=Math.min(30000,500*2**Math.min(i-1,6));
  h.advance(delay-1);assert.equal(h.starts.length,i);
  h.advance(1);assert.equal(h.starts.length,i+1);
 }
 assert.equal(h.starts[1].fallback,false);assert.ok(h.starts.slice(2).every(s=>s.fallback));
 h.r.dispose();h.advance(60000);assert.equal(h.starts.length,10);assert.equal(h.timers.size,0);
});

test('events from an old renderer cannot dispose or revive the replacement',()=>{
 const h=harness();h.r.start();h.r.fail(1,new Error('lost'));h.advance(500);
 assert.equal(h.r.fail(1,new Error('late event')),false);
 h.r.frame(1);assert.equal(h.r.isReady(),false);
 h.r.frame(2);assert.equal(h.r.isReady(),true);
 assert.equal(h.stops.length,1);
 h.r.dispose();h.r.frame(2);assert.equal(h.r.isReady(),false);
});

test('only sustained successful frames reset failure backoff',()=>{
 const h=harness();h.r.start();h.r.fail(1,new Error('first'));h.advance(500);h.r.frame(2);
 for(let i=0;i<16;i++){h.advance(1000);h.r.frame(2);}
 h.r.fail(2,new Error('new transient'));h.advance(500);
 assert.equal(h.starts.length,3);assert.equal(h.starts[2].fallback,false);
});

test('initialization that never finishes cannot hold the data presentation indefinitely',()=>{
 const h=harness();h.r.start();for(let i=0;i<16;i++){h.advance(1000);h.r.poll();}h.advance(500);
 assert.equal(h.starts.length,2,'stuck GPU initialization needs the same controlled recovery');
});

test('a suspended browser gets a fresh heartbeat interval before being classified as stalled',()=>{
 const h=harness();h.r.start();h.r.frame(1);
 h.advance(1000);h.r.poll();
 h.advance(60000);h.r.poll();h.r.frame(1);
 assert.equal(h.r.isReady(),true,'a delayed watchdog timer is not proof of renderer failure');
 assert.equal(h.stops.length,0);
});
