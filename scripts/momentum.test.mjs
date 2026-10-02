import test from 'node:test';
import assert from 'node:assert/strict';
import {createMomentum} from '../src/agent-trading/momentum.js';
import {packTokenTimeline,timelineBounds} from '../src/agent-trading/token-timeline.js';

test('a burst waiting in MOMENTUM cannot reserve empty field columns or move the existing roster',()=>{
 const q=createMomentum(),old=Array.from({length:72},(_,i)=>({key:'old-'+i,band:i%3,radius:18,time:1}));
 const fresh=Array.from({length:36},(_,i)=>({key:'new-'+i,band:i%3,radius:18,time:2}));
 const pack=items=>packTokenTimeline(items,timelineBounds(1252,1000,false,items),{labels:true,scroll:true,compact:true});
 const before=pack(old);q.add(fresh.map(t=>t.key));q.frame(0);
 const after=pack([...old,...fresh].filter(t=>!q.waitingForField(t.key)));
 assert.deepEqual([...after.points],[...before.points]);
 q.frame(6600);assert.equal(fresh.filter(t=>!q.waitingForField(t.key)).length,4);
 q.frame(7600);q.frame(7700);assert.equal(fresh.filter(t=>!q.waitingForField(t.key)).length,4);
});
test('every arrival has a visible turn then docks; a later burst does not replace pending tokens',()=>{
 const q=createMomentum({slots:2,holdMs:6000,travelMs:1000});q.add(['a','b','c'],0);q.add(['d','e','a'],500);
 const shown=new Set(),docked=new Set();
 for(let now=0;now<=22000;now+=100){for(const item of q.frame(now)){shown.add(item.key);if(item.progress===1)docked.add(item.key);}}
 assert.deepEqual([...shown].sort(),['a','b','c','d','e']);assert.deepEqual([...docked].sort(),['a','b','c','d','e']);assert.equal(q.pending(),0);
});
