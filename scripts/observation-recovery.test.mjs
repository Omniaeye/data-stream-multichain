import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector3} from 'three/webgpu';
import {createObservationClouds} from '../src/agent-trading/observation-clouds.js';
import {createOrganismStore,RESIDENCE_SECONDS,organismStage} from '../src/agent-trading/observation-organisms.js';
import {createVisibleOrganisms} from '../src/agent-trading/visible-organisms.js';
const datum={id:'capture:bsc:token:price',captureId:'capture',captureHash:'hash',tokenKey:'bsc:token',tokenName:'Token',chain:'bsc',zone:'market',receivedAt:'2026-10-03T12:00:00Z',field:{key:'price',value:1}};
function harness(){
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({style:{},hidden:false,textContent:'',remove(){}})};
 const host={dataset:{},append(){}},scene=new Scene(),camera=new PerspectiveCamera(30,1,.1,100);camera.position.set(0,0,16);camera.updateMatrixWorld();
 const brain={calls:0,pathFor:()=>[new Vector3(-4,0,0),new Vector3(-1,0,0),new Vector3(1,0,0),new Vector3(4,0,0)],radiusFor:()=>.1,ingest(){this.calls++;}};
 const renderer={compute(){}},state={store:createOrganismStore([datum.tokenKey],4,{residenceSeconds:RESIDENCE_SECONDS,pacedSpreadSeconds:0}),time:0};
 return {host,scene,camera,brain,renderer,state,restore(){globalThis.document=previous;}};
}

test('GPU reconstruction reuploads the same resident evidence without another receipt or journey',()=>{
 const h=harness();let clouds;
 try{
  clouds=createObservationClouds(h.scene,h.renderer,h.host,h.brain,[datum.tokenKey],h.state);
  clouds.ingest({rows:[datum],paced:true});clouds.update(1,h.camera,1000,1000,false);clouds.update(4,h.camera,1000,1000,false);clouds.update(300,h.camera,1000,1000,false);
  const record=h.state.store.get(datum.id),before=clouds.flow(),clock=Number(h.host.dataset.organismClock),birth=record?.birth;
  assert.ok(record,'logical observation state must be independent of the GPU instance');assert.equal(organismStage(record,clock),'resident');
  clouds.dispose();clouds=createObservationClouds(h.scene,h.renderer,h.host,h.brain,[datum.tokenKey],h.state);
  const after=clouds.flow();assert.equal(h.state.store.get(datum.id),record);assert.equal(record.birth,birth);assert.equal(record.datum,datum);
  assert.equal(Number(h.host.dataset.organismClock),clock);assert.equal(Number(h.host.dataset.particles),4);
  for(const key of ['received','delivered','retired','retained','resident'])assert.equal(after[key],before[key]);
  assert.equal(h.brain.calls,1,'a renderer rebuild must not re-ingest into brain/ribbons');
  clouds.ingest({rows:[datum],paced:true});clouds.update(.2,h.camera,1000,1000,false);assert.equal(clouds.flow().received,before.received);
 }finally{clouds?.dispose();h.restore();}
});

test('cohort changes and relayout retain observation ID, birth and counts after a capture gap',()=>{
 const h=harness();let clouds;
 try{
  clouds=createObservationClouds(h.scene,h.renderer,h.host,h.brain,[datum.tokenKey],h.state);clouds.ingest({rows:[datum],paced:true});clouds.update(1,h.camera,1000,1000,false);clouds.update(300,h.camera,1000,1000,false);
  const record=h.state.store.get(datum.id),birth=record?.birth,counts=clouds.flow();
  clouds.setTokens([]);assert.equal(Number(h.host.dataset.particles),0);
  clouds.setTokens([datum.tokenKey]);clouds.relayout();clouds.retarget(new Set([datum.tokenKey]));
  assert.equal(Number(h.host.dataset.particles),4);assert.equal(h.state.store.get(datum.id),record);assert.equal(record.birth,birth);
  assert.equal(clouds.flow().received,counts.received);assert.equal(clouds.flow().delivered,counts.delivered);assert.equal(h.brain.calls,1);
  const time=h.state.time;clouds.update(60,h.camera,1000,1000,true);assert.equal(h.state.time,time,'explicit pause must not advance logical observation time');
 }finally{clouds?.dispose();h.restore();}
});

test('GPU dense visibility removes expired slots and restores retained identities without re-ingestion',()=>{
 const store=createOrganismStore([datum.tokenKey],2),visible=createVisibleOrganisms();store.ingest({rows:[datum],paced:true});store.advance(0);let writes=0;
 visible.sync(store.slots,new Set([datum.tokenKey]),()=>writes++);const record=store.get(datum.id),birth=record.birth;
 visible.sync(store.slots,new Set(),()=>writes++);assert.equal(visible.records.length,0);
 visible.sync(store.slots,new Set([datum.tokenKey]),()=>writes++);assert.equal(visible.records[0],record);assert.equal(record.birth,birth);assert.equal(writes,2);assert.equal(store.stats(300).received,1);
});

test('rotating capture deduplication cannot re-admit an identity still retained by the page',()=>{
 const store=createOrganismStore([datum.tokenKey],64,{residenceSeconds:RESIDENCE_SECONDS,pacedSpreadSeconds:0});
 store.ingest({rows:[datum],paced:true});store.advance(0);store.advance(4);const first=store.get(datum.id),birth=first.birth;
 for(let i=0;i<40;i++){store.ingest({rows:[{...datum,id:'other:'+i,captureId:'other:'+i}],paced:true});store.advance(i+10);}
 const before=store.stats(300);const accepted=store.ingest({rows:[datum],paced:true});store.advance(300);
 assert.equal(accepted.length,0,'current identities remain deduplicated after the bounded capture cache rotates');
 assert.equal(store.get(datum.id),first);assert.equal(first.birth,birth);assert.equal(store.stats(300).received,before.received);
});

test('explicit pause also defers already received fields awaiting GPU admission',()=>{
 const h=harness();let clouds;
 try{
  clouds=createObservationClouds(h.scene,h.renderer,h.host,h.brain,[datum.tokenKey],h.state);clouds.ingest({rows:[datum],paced:true});clouds.update(1,h.camera,1000,1000,false);clouds.update(4,h.camera,1000,1000,false);
  const second={...datum,id:'second',captureId:'second'},clock=h.state.time,retained=clouds.flow().retained;
  clouds.ingest({rows:[second],paced:true});clouds.update(60,h.camera,1000,1000,true);
  assert.equal(h.state.time,clock);assert.equal(h.state.store.get(second.id).slot,-1,'pause must not admit new clouds to the frozen field');assert.equal(clouds.flow().retained,retained);
  clouds.update(.2,h.camera,1000,1000,false);assert.ok(h.state.store.get(second.id).slot>=0);
 }finally{clouds?.dispose();h.restore();}
});
