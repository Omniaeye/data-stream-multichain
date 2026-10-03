import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneCohortState,persistentSceneCohort,seedHistoricalSceneCohortState,sceneCohort,tokenObservationClock,networkSourceFreshness,isTokenSourceDelayed} from '../src/agent-trading/scene-cohort.js';
const at=Date.parse('2026-09-28T12:00:00Z'),iso=n=>new Date(n).toISOString(),hash='a'.repeat(64);
const token={id:'a',chain:'bsc',name:'A',firstSeenAt:iso(at-60000),evidence:{captureId:'fixture-capture',captureHash:hash,receivedAt:iso(at)},ranking:{captureId:'fixture-rank',captureHash:hash,window:'5m',receivedAt:iso(at),swaps:10,volume:1000,liquidity:5000},fields:[{key:'market_cap',value:20000},{key:'liquidity',value:5000}]};
const options=state=>({quality:true,view:'discovery',state});
const fresh=(base,when=at+300000)=>({...base,evidence:{...base.evidence,captureId:'new-'+base.id,receivedAt:iso(when)},ranking:{...base.ranking,receivedAt:iso(when)}});

test('one interrupted source stays visible while other sources keep the combined capture fresh',()=>{
 const state=createSceneCohortState();persistentSceneCohort([token],{...options(state),now:at});
 const other=fresh({...token,id:'sol',chain:'solana'});
 assert.equal(persistentSceneCohort([token,other],{...options(state),now:at+300000}).length,2);
 const bad={...fresh(token),fields:[{key:'market_cap',value:1}]};
 assert.equal(persistentSceneCohort([bad],{...options(state),now:at+300000}).length,0);
 assert.equal(token.evidence.receivedAt,iso(at));
});
test('new low-cap tokens keep their real discovery age while their source is delayed',()=>{
 const state=createSceneCohortState(),intro={...token,firstSeenAt:iso(at+1000),fields:[{key:'market_cap',value:8000},{key:'liquidity',value:5000}]};
 assert.equal(persistentSceneCohort([intro],{...options(state),now:at+1000}).length,1);
 assert.equal(persistentSceneCohort([intro],{...options(state),now:at+300000}).length,1);
 assert.equal(intro.firstSeenAt,iso(at+1000));
 const risky={...intro,fields:[...intro.fields,{key:'is_honeypot',value:true}]};
 assert.equal(persistentSceneCohort([risky],{...options(state),now:at+300000}).length,0);
});
test('five-minute 429 retains exact observed state without refreshing timestamps or Momentum eligibility',()=>{
 const state=createSceneCohortState(),before=JSON.stringify(token);
 assert.equal(persistentSceneCohort([token],{...options(state),now:at+1000}).length,1);
 for(const delay of [60000,181000,300000,3600000])assert.equal(persistentSceneCohort([token],{...options(state),now:at+delay}).length,1);
 assert.equal(sceneCohort([token],{quality:true,now:at+300000}).length,0);
 assert.equal(JSON.stringify(token),before);assert.equal(state.retained.get('bsc:a').asOf,at);
 assert.deepEqual(tokenObservationClock(token,at+300000),{asOf:at,stale:true});
});
test('strict new admission rejects unknown stale identities with or without state',()=>{
 assert.equal(persistentSceneCohort([token],{quality:true,now:at+60000}).length,0);
 assert.equal(persistentSceneCohort([token],{...options(createSceneCohortState()),now:at+60000}).length,0);
 assert.equal(persistentSceneCohort([{...token,evidence:{receivedAt:'bad'}}],{...options(createSceneCohortState()),now:at}).length,0);
});
test('fresh risk, invalid or missing cap and inactive ranking remove the last valid observation',()=>{
 for(const fields of [[{key:'market_cap',value:1}],[...token.fields,{key:'is_honeypot',value:true}],[{key:'liquidity',value:5000}]]){
  const state=createSceneCohortState();persistentSceneCohort([token],{...options(state),now:at});
  assert.equal(persistentSceneCohort([{...fresh(token),fields}],{...options(state),now:at+300000}).length,0);assert.equal(state.retained.size,0);
 }
 const state=createSceneCohortState();persistentSceneCohort([token],{...options(state),now:at});
 const inactive=fresh(token);inactive.ranking.swaps=0;
 assert.equal(persistentSceneCohort([inactive],{...options(state),now:at+300000}).length,0);assert.equal(state.retained.size,0);
});
test('a different stale receipt cannot reuse an admitted identity',()=>{
 const state=createSceneCohortState();persistentSceneCohort([token],{...options(state),now:at});
 const replaced={...token,evidence:{...token.evidence,captureId:'replacement'}};
 assert.equal(persistentSceneCohort([replaced],{...options(state),now:at+300000}).length,0);assert.equal(state.retained.size,0);
});
test('fresh resumption advances only to real evidence and missing roster keys bound memory',()=>{
 const state=createSceneCohortState();persistentSceneCohort([token],{...options(state),now:at});
 const resumed=fresh(token);
 assert.equal(persistentSceneCohort([resumed],{...options(state),now:at+300000}).length,1);
 assert.equal(state.retained.get('bsc:a').asOf,at+300000);
 assert.equal(sceneCohort([resumed],{quality:true,now:at+300000}).length,1);
 persistentSceneCohort([],{...options(state),now:at+300000});assert.equal(state.retained.size,0);
});
test('wall time does not expire the historical intro but a fresh mature-cap violation does',()=>{
 const state=createSceneCohortState(),intro={...token,firstSeenAt:iso(at-29*60000),fields:[{key:'market_cap',value:8000},{key:'liquidity',value:5000}]};
 assert.equal(persistentSceneCohort([intro],{...options(state),now:at}).length,1);
 assert.equal(persistentSceneCohort([intro],{...options(state),now:at+300000}).length,1);
 assert.equal(persistentSceneCohort([fresh(intro)],{...options(state),now:at+300000}).length,0);
});
test('one explicit historical bootstrap restores visual state but never stale arrivals or fresh eligibility',()=>{
 const state=createSceneCohortState();assert.equal(seedHistoricalSceneCohortState([token],{...options(state),now:at+300000}),1);
 assert.equal(persistentSceneCohort([token],{...options(state),now:at+300000}).length,1);
 assert.equal(sceneCohort([token],{quality:true,now:at+300000}).length,0);
 const later={...token,id:'unknown'};
 assert.equal(seedHistoricalSceneCohortState([later],{...options(state),now:at+300000}),0);
 assert.equal(persistentSceneCohort([token,later],{...options(state),now:at+300000}).length,1);
});
test('historical bootstrap requires capture identity, SHA256, original valid time and strict original quality',()=>{
 const invalid=[{...token,evidence:{...token.evidence,captureHash:'bad'}},{...token,evidence:{...token.evidence,captureId:''}},{...token,evidence:{...token.evidence,receivedAt:'invalid'}},{...token,evidence:{...token.evidence,receivedAt:iso(at+400000)}},{...token,ranking:{...token.ranking,receivedAt:iso(at+1000)}},{...token,fields:[{key:'market_cap',value:1}]},{...token,fields:[...token.fields,{key:'is_wash_trading',value:'true'}]}];
 for(const t of invalid){const state=createSceneCohortState();assert.equal(seedHistoricalSceneCohortState([t],{...options(state),now:at+300000}),0);assert.equal(state.retained.size,0);}
});
test('per-network status distinguishes current, partial, stale, absent and invalid sources',()=>{
 const source=(chain,endpoint,delay)=>({chain,endpoint,receivedAt:iso(at+300000-delay),cadenceMs:15000});
 const sources=[source('bsc','market_rank',1000),source('bsc','trenches',2000),source('solana','market_rank',300000),source('solana','trenches',300000),source('robinhood','market_rank',1000),source('robinhood','trenches',300000)];
 const b=networkSourceFreshness(sources,'bsc',at+300000),r=networkSourceFreshness(sources,'robinhood',at+300000),sol=networkSourceFreshness(sources,'solana',at+300000);
 assert.equal(b.stale,false);assert.equal(b.partial,false);assert.equal(r.stale,false);assert.equal(r.partial,true);assert.equal(sol.stale,true);
 assert.equal(networkSourceFreshness([],'bsc',at).items.length,0);
 assert.equal(networkSourceFreshness([source('bsc','market_rank',1000)],'bsc',at+300000).partial,true);
 assert.equal(networkSourceFreshness([{chain:'bsc',receivedAt:'invalid'}],'bsc',at).stale,true);
 assert.equal(networkSourceFreshness([source('bsc','market_rank',-3000)],'bsc',at+300000).stale,true);
});

test('historical bootstrap allows real first normalization after receipt without making evidence fresh',()=>{
 const state=createSceneCohortState(),normalized={...token,firstSeenAt:iso(at+1000),fields:[{key:'market_cap',value:8000},{key:'liquidity',value:5000}]};
 const before=JSON.stringify(normalized);
 assert.equal(seedHistoricalSceneCohortState([normalized],{...options(state),now:at+300000}),1);
 assert.equal(persistentSceneCohort([normalized],{...options(state),now:at+300000}).length,1);
 assert.equal(state.retained.get('bsc:a').asOf,at);assert.equal(state.retained.get('bsc:a').lifecycleAt,at+1000);
 assert.equal(sceneCohort([normalized],{quality:true,now:at+300000}).length,0);assert.equal(JSON.stringify(normalized),before);
});
test('retention cannot opt out of strict risk and activity quality for new entries',()=>{
 const bad={...token,fields:[{key:'market_cap',value:1}]};
 assert.equal(persistentSceneCohort([bad],{quality:false,now:at,state:createSceneCohortState()}).length,0);
});
test('absent-token retention follows its own endpoint and conservatively handles unknown source',()=>{
 const now=at+300000,source=(endpoint,age)=>({chain:'bsc',endpoint,receivedAt:iso(now-age),cadenceMs:15000});
 const sources=[source('market_rank',300000),source('trenches',1000)];
 const ranked={...token,observationMetadata:{endpoint:'market_rank'}},launched={...token,observationMetadata:{endpoint:'trenches'}};
 assert.equal(isTokenSourceDelayed(ranked,sources,now),true);assert.equal(isTokenSourceDelayed(launched,sources,now),false);
 assert.equal(isTokenSourceDelayed(token,sources,now),true);
 assert.equal(isTokenSourceDelayed(token,[source('market_rank',1000),source('trenches',1000)],now),false);
 assert.equal(isTokenSourceDelayed(launched,[],now),true);
 assert.equal(isTokenSourceDelayed({...launched,chain:'sol'},[{chain:'solana',endpoint:'trenches',receivedAt:iso(now),cadenceMs:15000}],now),false);
});

test('switching display modes during a gap preserves globally qualified observations',()=>{
 const state=createSceneCohortState(),old={...token,firstSeenAt:iso(at-3600000),fields:[...token.fields,{key:'creation_timestamp',value:(at-48*3600000)/1000}]};
 const policy={...options(state),view:'discovery'};
 assert.equal(persistentSceneCohort([old],{...policy,now:at}).length,0);
 assert.equal(state.retained.size,1);
 assert.equal(persistentSceneCohort([old],{...policy,view:'global',now:at+300000}).length,1);
 assert.equal(persistentSceneCohort([old],{...policy,now:at+300000}).length,0);assert.equal(state.retained.size,1);
 const updated=fresh(old);
 assert.equal(persistentSceneCohort([updated],{...policy,now:at+300000}).length,0);assert.equal(state.retained.get('bsc:a').asOf,at+300000);
 assert.equal(persistentSceneCohort([updated],{...policy,view:'global',now:at+600000}).length,1);
});
test('historical seed admits global quality independently of the initial display filter',()=>{
 const state=createSceneCohortState(),old={...token,firstSeenAt:iso(at-3600000),fields:[...token.fields,{key:'creation_timestamp',value:(at-48*3600000)/1000}]};
 assert.equal(seedHistoricalSceneCohortState([old],{...options(state),view:'discovery',now:at+300000}),1);
 assert.equal(persistentSceneCohort([old],{...options(state),now:at+300000}).length,0);assert.equal(state.retained.size,1);
 assert.equal(persistentSceneCohort([old],{...options(state),view:'global',now:at+300000}).length,1);
});
