/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSceneClock,sceneCohort} from '../src/agent-trading/scene-cohort.js';

const at=Date.parse('2026-09-25T12:00:00Z');
const iso=n=>new Date(n).toISOString();
const token={id:'observed',chain:'bsc',name:'OBS',firstSeenAt:iso(at-3600000),fields:[{key:'market_cap',value:25000},{key:'liquidity',value:5000}],evidence:{receivedAt:iso(at)},ranking:{window:'5m',receivedAt:iso(at),swaps:10,volume:1000,liquidity:5000}};

test('a delayed full snapshot retains eligible observations without changing source time',()=>{
 const capture={receivedAt:iso(at),tokens:[token]};
 assert.deepEqual(captureSceneClock(capture,at+2000),{stale:false,now:at+2000});
 assert.equal(sceneCohort(capture.tokens,{quality:true,now:at+60000}).length,0);
 const clock=captureSceneClock(capture,at+60000);
 assert.equal(clock.stale,true);
 assert.equal(sceneCohort(capture.tokens,{quality:true,now:clock.now}).length,1);
 assert.equal(capture.tokens[0].evidence.receivedAt,iso(at));
});

test('fresh recovery applies current volume and cap filters instead of retaining old eligibility',()=>{
 const receivedAt=iso(at+120000),inactive={...token,evidence:{receivedAt},ranking:{...token.ranking,receivedAt,volume:0}};
 const clock=captureSceneClock({receivedAt},at+121000);
 assert.equal(clock.stale,false);
 assert.equal(sceneCohort([inactive],{quality:true,now:clock.now}).length,0);
 assert.equal(sceneCohort([{...inactive,fields:[{key:'market_cap',value:0}]}],{quality:true,now:clock.now}).length,0);
});
