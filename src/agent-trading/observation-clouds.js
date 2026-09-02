// The same GPU particles follow their observation, then stay at its token.
// Local inverse-square attraction + curl adapts the MIT Three.js attractor field.
import * as THREE from 'three/webgpu';
import {Fn,If,Loop,float,uint,hash,instanceIndex,instancedArray,instancedBufferAttribute,uniform,uniformArray,vec3,vec4,mix,color,mod,uv} from 'three/tsl';
import {createOrganismStore,organismStage,PARTICLES_PER_ORGANISM,JOURNEY_SECONDS,RESIDENCE_SECONDS,RESIDENT_FADE_SECONDS} from './observation-organisms.js';
import {familyFor,FAMILY_COLORS} from './field-families.js';
import {CATEGORY_ORDER,journeyPoint} from './flow-path.js';
import {journeyNode} from './journey-node.js';
import {createVisibleOrganisms} from './visible-organisms.js';
const VISIBLE_ORGANISMS=24576;

export function createObservationClouds(scene,renderer,host,brain,visibleKeys){
 const store=createOrganismStore(visibleKeys,VISIBLE_ORGANISMS,{residenceSeconds:RESIDENCE_SECONDS,pacedSpreadSeconds:.12}),featured=new Set(visibleKeys),resources=[],track=r=>(resources.push(r),r);
 const visible=createVisibleOrganisms();
 const count=VISIBLE_ORGANISMS*PARTICLES_PER_ORGANISM;
 const positions=instancedArray(count,'vec3'),velocities=instancedArray(count,'vec3');
 const clock=uniform(0),physicsStep=uniform(1/60),drawCount=uniform(0),selectedSlot=uniform(-1);
 const geometry=track(new THREE.PlaneGeometry(1,1));
 // Share a single vertex buffer: mobile WebGPU commonly permits only eight.
 const routeBuffer=new THREE.InstancedInterleavedBuffer(new Float32Array(count*16),16).setUsage(THREE.DynamicDrawUsage);
 const sources=new THREE.InterleavedBufferAttribute(routeBuffer,4,0),regions=new THREE.InterleavedBufferAttribute(routeBuffer,4,4);
 const relays=new THREE.InterleavedBufferAttribute(routeBuffer,4,8),targets=new THREE.InterleavedBufferAttribute(routeBuffer,4,12);
 const [p0,p1,p2,p3]=[0,4,8,12].map(offset=>instancedBufferAttribute(routeBuffer,'vec4',16,offset).setUsage(THREE.DynamicDrawUsage));
 const age=clock.sub(p0.w),progress=age.div(JOURNEY_SECONDS).clamp(0,1),seed=p1.w;
 const owner=instanceIndex.div(uint(PARTICLES_PER_ORGANISM)).toUint();
 const selected=owner.toFloat().equal(selectedSlot);
 // Continuous center path. Arrival does not create or replace any particles.
 const phase=age.sub(JOURNEY_SECONDS).max(0).mul(1.8).add(seed.mul(Math.PI*2)),radius=seed.mul(.2).add(1.35).mul(p2.w);
 const orbit=vec3(phase.cos().mul(radius),phase.sin().mul(radius).mul(.95),phase.mul(.7).sin().mul(radius).mul(.22));
 const end=p3.xyz.add(orbit);
 const center=journeyNode([p0.xyz,p1.xyz,p2.xyz,end],progress,seed,clock);
 const mass=hash(instanceIndex.add(uint(417))).mul(.75).add(.25);
 const localAttractors=uniformArray([new THREE.Vector3(-.65,0,0),new THREE.Vector3(.65,0,-.3),new THREE.Vector3(0,.35,.65)]);
 const axes=uniformArray([new THREE.Vector3(0,1,0),new THREE.Vector3(.8,.4,.5).normalize(),new THREE.Vector3(-.6,.1,1).normalize()]);
 const initialize=Fn(()=>{
  positions.element(instanceIndex).assign(vec3(hash(instanceIndex.add(uint(12))),hash(instanceIndex.add(uint(37))),hash(instanceIndex.add(uint(91)))).sub(.5).mul(1.6));
  velocities.element(instanceIndex).assign(vec3(0));
 })().compute(count);
 renderer.compute(initialize);
 const compute=Fn(()=>{If(instanceIndex.lessThan(drawCount.toUint()),()=>{
  const p=positions.element(instanceIndex),v=velocities.element(instanceIndex),force=vec3(0).toVar();
  Loop(3,({i})=>{const offset=localAttractors.element(i).sub(p),distance=offset.length().max(.08),strength=float(2.22).mul(mass).div(distance.mul(distance));
   force.addAssign(offset.normalize().mul(strength));force.addAssign(axes.element(i).mul(strength).mul(2.75).cross(offset));
  });
  v.addAssign(force.mul(physicsStep));If(v.length().greaterThan(8),()=>{v.assign(v.normalize().mul(8));});v.mulAssign(float(.9).pow(physicsStep.mul(60)));p.addAssign(v.mul(physicsStep));p.assign(mod(p.add(3),6).sub(3));
 });})().compute(count);
 const material=track(new THREE.SpriteNodeMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
 material.positionNode=center.add(positions.toAttribute().mul(mix(float(.022),p2.w.mul(.035).add(.004),progress)));
 const palette=uniformArray(CATEGORY_ORDER.map(category=>new THREE.Color(FAMILY_COLORS[category])));
 const tint=palette.element(p3.w.floor().toUint()).mul(velocities.toAttribute().length().div(16).add(.72));
 const fade=float(JOURNEY_SECONDS+RESIDENCE_SECONDS).sub(age).div(RESIDENT_FADE_SECONDS).clamp(0,1);
 // Soft round motes, not tiny opaque quads. Attenuate the brain crossing so
 // titles and synapses remain readable while the same organisms travel through.
 const disc=float(1).sub(uv().sub(.5).length().mul(2)).max(0).pow(1.5);
 const throughBrain=progress.smoothstep(.27,.37).mul(float(1).sub(progress.smoothstep(.53,.64)));
 const opacity=selected.select(.9,.64).mul(float(1).sub(throughBrain.mul(.68))).mul(disc).mul(fade);
 material.colorNode=vec4(mix(tint,color('#e2fff6'),selected.select(1,0)),age.greaterThanEqual(0).select(opacity,0));
 material.scaleNode=mass.mul(selected.select(.042,.029));
 const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);
 const focus=document.createElement('span');focus.className='brain-label organism-focus';focus.hidden=true;host.append(focus);
 let time=0,report=0,selectedId=null,selectedDatum=null,flow=store.stats(0);flow.active=[];flow.selected=null;
 const projected=new THREE.Vector3(),sampled=new THREE.Vector3();
 function write(record,renderSlot){
  const category=CATEGORY_ORDER.indexOf(familyFor(record.datum.field.key).category);
  const path=brain.pathFor(record.datum),values=[record.birth,record.seed,brain.radiusFor(record.datum),Math.max(0,category)];
  for(let i=0;i<4;i++){
   const buffer=[sources,regions,relays,targets][i],p=path[i];
   for(let j=0;j<PARTICLES_PER_ORGANISM;j++)buffer.setXYZW(renderSlot*PARTICLES_PER_ORGANISM+j,p.x,p.y,p.z,values[i]);
  }
  routeBuffer.addUpdateRange(renderSlot*PARTICLES_PER_ORGANISM*16,PARTICLES_PER_ORGANISM*16);
 }
 function upload(){
  // Transfer changed slots only. A continuous stream must not upload the entire
  // full route buffer for every small group received by the presentation queue.
  const ranges=routeBuffer.updateRanges.sort((a,b)=>a.start-b.start),merged=[];
  for(const range of ranges){const previous=merged.at(-1);if(previous&&range.start<=previous.start+previous.count)previous.count=Math.max(previous.start+previous.count,range.start+range.count)-previous.start;else merged.push({...range});}
  routeBuffer.clearUpdateRanges();merged.forEach(r=>routeBuffer.addUpdateRange(r.start,r.count));
  routeBuffer.needsUpdate=true;
 }
 function syncVisible(){
  const dirty=visible.sync(store.slots,featured,write);
  drawCount.value=mesh.count=visible.records.length*PARTICLES_PER_ORGANISM;
  // Dispatch and draw only the dense visible list, including after a filter change.
  compute.count=mesh.count;if(dirty&&routeBuffer.updateRanges.length)upload();
 }
 function reportFlow(){
  flow=store.stats(time);flow.active=visible.records.filter(record=>organismStage(record,time)==='brain');flow.selected=selectedId;
  flow.displayed=visible.records.length;
  host.dataset.organisms=String(flow.displayed);host.dataset.organismsReceived=String(flow.received);
  host.dataset.organismsStored=String(flow.retained);host.dataset.renderTokenCount=String(new Set(visible.records.map(r=>r.datum.tokenKey)).size);
  host.dataset.organismsResident=String(flow.resident);host.dataset.organismsRetired=String(flow.retired);
  host.dataset.particles=String(mesh.count);host.dataset.organismClock=time.toFixed(2);
  host.dataset.organismModel='one-field-one-cloud';
 }
 function sample(record){
  const path=brain.pathFor(record.datum),age=Math.max(0,time-record.birth),p=Math.min(1,age/JOURNEY_SECONDS);
  const phase=Math.max(0,age-JOURNEY_SECONDS)*1.8+record.seed*Math.PI*2,radius=(1.35+record.seed*.2)*brain.radiusFor(record.datum);
  const end=path[3].clone().add(new THREE.Vector3(Math.cos(phase)*radius,Math.sin(phase)*radius*.95,Math.sin(phase*.7)*radius*.22));
  return sampled.set(...journeyPoint([path[0].toArray(),path[1].toArray(),path[2].toArray(),end.toArray()],p,record.seed,time));
 }
 return {
  setTokens(keys){featured.clear();keys.forEach(key=>featured.add(key));store.setVisibleKeys(keys);syncVisible();reportFlow();},
  ingest(route){store.ingest(route);brain.ingest(route);},
  relayout(){visible.records.forEach(write);if(visible.records.length)upload();},
  flow(){return flow;},
  select(datum){selectedDatum=datum;selectedId=datum?.id??null;},
  update(dt,camera,width,height,frozen,reduced=false){
   // One bounded physics integration per frame prevents a GPU catch-up spiral.
   // The observation journey still advances on the full presentation clock.
   if(!frozen&&!reduced){time+=dt;clock.value=time;physicsStep.value=Math.min(dt,1/30);if(mesh.count&&dt>0)renderer.compute(compute);}
   report+=dt;if(report>=.1){report=0;store.advance(time,reduced);syncVisible();reportFlow();}
   const record=selectedId?store.get(selectedId):null;selectedSlot.value=selectedId?visible.indexOf(selectedId):-1;
   host.dataset.selectedOrganism=record?JSON.stringify({id:record.datum.id,slot:record.slot,stage:organismStage(record,time),tokenKey:record.datum.tokenKey,particles:PARTICLES_PER_ORGANISM}):'';
   if(record&&selectedSlot.value>=0){
    projected.copy(sample(record)).project(camera);focus.hidden=Math.abs(projected.z)>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1;
    focus.textContent=`${record.datum.field.key} ${String(record.datum.field.value).slice(0,18)} → ${record.datum.tokenName} · ${organismStage(record,time)}`;
    const half=Math.min(160,width/2-12);
    focus.style.left=THREE.MathUtils.clamp((projected.x+1)*width/2,half+8,width-half-8)+'px';focus.style.top=((-projected.y+1)*height/2-20)+'px';
   }else{focus.hidden=!selectedId;focus.textContent=selectedDatum?`${selectedDatum.tokenName} · ${record?'Queued':'Outside the visible window'}`:'';focus.style.left='50%';focus.style.top='64px';}
  },
  dispose(){scene.remove(mesh);mesh.dispose();focus.remove();resources.forEach(r=>r.dispose());}
 };
}
