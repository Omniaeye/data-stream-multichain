// Adapted from the MIT-licensed Three.js compute attractors example.
// See THREE-LICENSE.txt. Each observation owns one persistent particle cloud.
import * as THREE from 'three/webgpu';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ATTRACTOR_COUNT,TOKEN_EXIT_GRACE_MS} from './attractor-selection.js';
import {tokenKey,canonicalChain,numericField} from './token-selection.js';
import {createObservationClouds} from './observation-clouds.js';
import {logoUrl} from './market-activity.js';
import {createNeuralBrain} from './neural-brain.js';
import {tokenAppearance,capLabelColor,globalTokenDiameter} from './token-appearance.js';
import {tokenSlotPosition} from './token-layout.js';
import {packGlobalTokens,globalBounds} from './token-global-layout.js';
import {packTokenTimeline,timelineBounds,timelineTime} from './token-timeline.js';
import {TOKEN_NEW_MARK_MS} from './token-arrivals.js';
import {sceneAnchors} from './scene-anchors.js';
import {placeNewLabels} from './new-token-labels.js';
import {compactCap,tokenTicker} from './token-details.js';
import {createValueMotion} from './value-motion.js';
import {createMomentum} from './momentum.js';
import {createRenderRecovery} from './render-recovery.js';

export function createUniverse(host,onSelect,onError,onBrainInspect,trading={}){
 let disposed=false,renderer,controls,camera,scene,ready=false,paused=false,last=0,frames=0,statsAt=0,narrow=null;
 const badges=[],leavingBadges=[],badgeMap=new Map(),centers=[],worldPositions=new Map(),positions=new Map(),radii=new Map();
 let layoutCamera,packed,layoutSignature='',packedViewport='',fieldWidth=0,fieldHeight=0,cameraFlight=null,timelineOffset=0,timelineLimit=0,currentBounds,focusAnchor=null,focusFraction=.4;
 let view='global',trackedKeys=new Set();
 const arriving=new Map(),capMotions=new Map(),momentum=createMomentum(),movingKeys=new Set();let capPaintAt=0,momentumAt=0,momentumFrame=new Map(),stagedLast=new Set(),stageSignature='';
 const momentumHeading=document.createElement('div');momentumHeading.className='momentum-heading';momentumHeading.textContent='MOMENTUM';host.append(momentumHeading);
 let assetsEnabled=true;const imageQueue=new Set(),imageRequests=new Map();
 function pumpImages(){
  if(!assetsEnabled||disposed)return;
  while(imageRequests.size<3&&imageQueue.size){
   const img=[...imageQueue].find(img=>img.closest('[data-momentum=true]'))??imageQueue.values().next().value;imageQueue.delete(img);
   if(!img.isConnected||!img.dataset.src)continue;
   const finish=failed=>{const timer=imageRequests.get(img);if(timer===undefined)return;clearTimeout(timer);imageRequests.delete(img);img.onload=null;img.onerror=null;if(failed){img.removeAttribute('src');img.remove();}pumpImages();};
   imageRequests.set(img,setTimeout(()=>finish(true),10000));img.onload=()=>finish(false);img.onerror=()=>finish(true);img.src=img.dataset.src;delete img.dataset.src;imageObserver.unobserve(img);
  }
 }
 const imageObserver=new IntersectionObserver(entries=>{for(const entry of entries){const img=entry.target;if(entry.isIntersecting&&img.dataset.src)imageQueue.add(img);else imageQueue.delete(img);}pumpImages();},{root:host,rootMargin:'80px'});
 const timelineHint=document.createElement('div');timelineHint.className='token-timeline-heading';timelineHint.hidden=true;timelineHint.innerHTML='<span>NEWEST</span><span aria-hidden="true">→</span><span>EARLIER</span>';timelineHint.title='Ordered by first detection in this feed, within each network. Returning tokens keep their original time.';host.append(timelineHint);
 const timelineNav=document.createElement('div');timelineNav.className='token-timeline-nav';timelineNav.hidden=true;
 const newer=document.createElement('button'),older=document.createElement('button'),slider=document.createElement('input');
 newer.textContent='←';newer.setAttribute('aria-label','Newer tokens');older.textContent='→';older.setAttribute('aria-label','Earlier tokens');slider.type='range';slider.min='0';slider.step='1';slider.value='0';slider.setAttribute('aria-label','Token timeline position');
 timelineNav.append(newer,slider,older);host.append(timelineNav);
 function moveTimeline(value){focusAnchor=null;timelineOffset=Math.max(0,Math.min(timelineLimit,value));slider.value=String(timelineOffset);layoutSignature='';frameCamera();controls?.update();layout(true);}
 newer.onclick=()=>moveTimeline(timelineOffset-(currentBounds?.[0].width??300)*.8);older.onclick=()=>moveTimeline(timelineOffset+(currentBounds?.[0].width??300)*.8);slider.oninput=()=>moveTimeline(Number(slider.value));
 let brain,clouds,sources=[];
 let tokens=[],cohort=null,cohortSet=null,routingKeys=[],routingSet=new Set(),flowCache=null,filteredFlow=null;let badgesDirty=true,lastMatrix='';const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const frameCost={clouds:0,brain:0,badges:0,render:0};
 const projected=new THREE.Vector3(),edge=new THREE.Vector3(),cameraRight=new THREE.Vector3();
 function frameCamera(){if(!camera)return;camera.position.set(0,narrow?.75:1.1,16);controls?.target.set(0,narrow?-.35:0,0);camera.lookAt(0,narrow?-.35:0,0);camera.updateMatrixWorld();}
 function unproject(x,y){const p=new THREE.Vector3(x/fieldWidth*2-1,1-y/fieldHeight*2,.5).unproject(layoutCamera),ray=p.sub(layoutCamera.position);return layoutCamera.position.clone().addScaledVector(ray,-layoutCamera.position.z/ray.z);}
 function placeBrain(){const anchors=sceneAnchors(fieldWidth,fieldHeight,narrow),origin=unproject(...anchors.origin),panel=anchors.trading,parent=host.parentElement;
  if(parent){parent.style.setProperty('--trading-left',(host.offsetLeft+panel.x)+'px');parent.style.setProperty('--trading-top',panel.y+'px');parent.style.setProperty('--trading-width',panel.width+'px');parent.style.setProperty('--trading-height',panel.height+'px');}
  brain?.resize(narrow,{origin,ports:anchors.ports.map(p=>unproject(...p)),scale:origin.distanceTo(unproject(anchors.origin[0]+anchors.brainWidth/3,anchors.origin[1])),tradingTarget:[panel.x+3,panel.y+14]});}
 function layout(reroute=false){
  badgesDirty=true;centers.length=tokens.length;
  const items=tokens.filter(t=>(!cohortSet||cohortSet.has(tokenKey(t)))&&!momentum.waitingForField(tokenKey(t))).map(t=>({key:tokenKey(t),band:['robinhood','bsc','solana'].indexOf(canonicalChain(t.chain)),time:timelineTime(t),arriving:(arriving.get(tokenKey(t))??0)>Date.now(),radius:Math.round((view==='global'?globalTokenDiameter(t):tokenAppearance(t).diameter)*2)/4}));
  const signature=view+':'+fieldWidth+':'+fieldHeight+':'+items.map(t=>t.key+':'+t.radius+':'+t.time+':'+t.arriving).join('|');
  let changed=false;
  // Keep the hovered instrument anchored while its figures keep updating.
  // Resize, mode/cohort changes and actual arrivals still get a fresh layout.
  const viewportSignature=view+':'+fieldWidth+':'+fieldHeight;
  const hold=!!host.querySelector('.attractor-token[aria-expanded=true]')&&packedViewport===viewportSignature&&packed?.points.size===items.length&&items.every(item=>packed.points.has(item.key));
  if(layoutCamera&&signature!==layoutSignature&&!hold){
   const bounds=view==='global'?globalBounds(fieldWidth,fieldHeight,narrow,items):timelineBounds(fieldWidth,fieldHeight,narrow,items);
   currentBounds=bounds;packed=view==='global'?packGlobalTokens(items,bounds,packed):packTokenTimeline(items,bounds,{labels:true,scroll:true,unified:narrow,compact:true});layoutSignature=signature;packedViewport=viewportSignature;changed=true;
   timelineHint.title=narrow?'Ordered by first detection across networks.':'Ordered by first detection within each network.';
   timelineLimit=Math.max(0,packed.contentWidth-bounds[0].width);const anchor=packed.points.get(focusAnchor);if(anchor)timelineOffset=anchor.x-bounds[0].x-bounds[0].width*focusFraction;timelineOffset=Math.max(0,Math.min(timelineOffset,timelineLimit));slider.max=String(Math.ceil(timelineLimit));slider.value=String(timelineOffset);timelineNav.hidden=view==='global'||!timelineLimit;timelineHint.hidden=view==='global';newer.disabled=timelineOffset<=0;older.disabled=timelineOffset>=timelineLimit;
   timelineNav.style.left=bounds[0].x+'px';timelineNav.style.top=(bounds[0].y-48)+'px';timelineNav.style.width=Math.min(220,bounds[0].width)+'px';
   const anchors=sceneAnchors(fieldWidth,fieldHeight,narrow);momentumHeading.style.left=(narrow?16:fieldWidth*.482)+'px';momentumHeading.style.transform=narrow?'none':'translateX(-50%)';momentumHeading.style.top=(narrow?anchors.trading.y+anchors.trading.height+8:86)+'px';
   timelineHint.style.left=bounds[0].x+'px';timelineHint.style.top=(bounds[0].y-28)+'px';timelineHint.style.width=bounds[0].width+'px';
   for(const [key,p] of packed.points){const world=unproject(p.x-timelineOffset,p.y);worldPositions.set(key,world);radii.set(key,world.distanceTo(unproject(p.x-timelineOffset+p.radius,p.y)));}
   host.style.setProperty('--caption-scale',view==='global'?packed.labelScale:1);host.dataset.sceneMode=view;
   host.dataset.tokenSpacing=packed.gap.toFixed(2);host.dataset.tokenLayoutScale=packed.scale.toFixed(3);
  }
  tokens.forEach((token,i)=>{const key=tokenKey(token),band=['robinhood','bsc','solana'].indexOf(canonicalChain(token.chain));if(!positions.has(key))positions.set(key,worldPositions.get(key)?.clone()??new THREE.Vector3(...tokenSlotPosition(i,band,narrow)));centers[i]=positions.get(key);
   // The first rendered frame starts populated, before animating later arrivals.
   if(!ready&&worldPositions.has(key))centers[i].copy(worldPositions.get(key));
  });
  routingKeys=packed?[...packed.points].filter(([,p])=>view==='global'||p.x-timelineOffset>=currentBounds[0].x+30&&p.x-timelineOffset<=fieldWidth-30).map(([key])=>key):(cohort??tokens.map(tokenKey));routingSet=new Set(routingKeys);flowCache=null;
  routingKeys=[...new Set([...routingKeys,...momentumFrame.keys()])];routingSet=new Set(routingKeys);
  brain?.refreshTokens();brain?.setCohort(routingKeys);clouds?.setTokens(routingKeys);if(changed||reroute)clouds?.relayout();
 }
 function resize(){if(!renderer||!camera)return;const {width,height}=host.getBoundingClientRect();if(!width||!height)return;fieldWidth=width;fieldHeight=height;renderer.setSize(width,height);const nextNarrow=width<780;if(nextNarrow!==narrow){narrow=nextNarrow;controls.enablePan=!narrow;controls.enableZoom=!narrow;frameCamera();}
  camera.aspect=width/height;camera.zoom=Math.min(1,width/height/(narrow?.75:1.4));camera.updateProjectionMatrix();
  layoutCamera=camera.clone();layoutCamera.position.set(0,narrow?.75:1.1,16);layoutCamera.lookAt(0,narrow?-.35:0,0);layoutCamera.updateMatrixWorld();
  placeBrain();layout(true);
 }
 function sync(){if(!ready)return;const keys=new Set(tokens.map(tokenKey));
  for(const [key,b] of badgeMap)if(!keys.has(key)){b.remove();badgeMap.delete(key);capMotions.delete(key);positions.delete(key);worldPositions.delete(key);radii.delete(key);}
  badges.length=0;leavingBadges.length=0;
  tokens.forEach((token,i)=>{const key=tokenKey(token);let b=badgeMap.get(key);
   if(!b){b=document.createElement('button');b.className='attractor-token';b.dataset.tokenKey=key;const core=document.createElement('span');core.className='attractor-token-core';const caption=document.createElement('span');caption.className='attractor-token-caption';caption.append(document.createElement('strong'),document.createElement('small'));b.append(core,caption);badgeMap.set(key,b);host.append(b);}
   const core=b.firstElementChild;
   const caption=b.lastElementChild,cap=numericField(token,'market_cap');caption.firstElementChild.textContent=tokenTicker(token);
   let motion=capMotions.get(key);if(!motion){motion=createValueMotion();capMotions.set(key,motion);}motion.set(cap,performance.now(),reduced.matches);
   caption.lastElementChild.textContent=compactCap(motion.at(performance.now()));caption.lastElementChild.dataset.updating=String(motion.active(performance.now()));b.dataset.marketCap=cap===null?'':String(cap);b.dataset.capReceivedAt=token.evidence?.receivedAt??'';b.style.setProperty('--cap-label-color',capLabelColor(cap));b.title=tokenTicker(token)+' · '+compactCap(cap);
   const url=logoUrl(token.logo),signature=token.name+':'+url;
   if(b.dataset.signature!==signature){b.dataset.signature=signature;core.textContent=token.name.slice(0,3);
    if(url){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.decoding='async';img.fetchPriority='low';img.dataset.src=url;img.onerror=()=>img.remove();core.append(img);imageObserver.observe(img);}
   }
   b.setAttribute('aria-label','Inspect '+token.name);b.setAttribute('aria-haspopup','dialog');b.onclick=()=>onSelect(key);
   b.dataset.firstSeenAt=token.firstSeenAt??'';
   if(token.sceneAbsentSince)leavingBadges.push({el:b,exitAt:token.sceneAbsentSince+TOKEN_EXIT_GRACE_MS});else b.style.opacity='1';
   const appearance=tokenAppearance(token);b.style.setProperty('--network-color',appearance.color);b.dataset.knownCap=String(appearance.knownCap);b.dataset.presence=token.sceneAbsentSince?'leaving':'current';
   b.dataset.arriving=String((arriving.get(key)??0)>Date.now());b.dataset.socialTracked=String(trackedKeys.has(key));
   badges.push(b);
  });
 }
 function releaseRenderer(instance){
  if(!instance)return;
  instance.onDeviceLost=()=>{};instance.onError=()=>{};
  instance.domElement.remove();
  // dispose() on an uninitialized Three renderer invokes init() internally.
  // A superseded initialization is disposed when its own promise settles.
  if(instance.initialized){
   void instance.setAnimationLoop(null).catch(()=>{});
   void instance.dispose().catch(error=>console.warn('Renderer cleanup failed',error));
  }else instance.backend?.device?.destroy();
 }
 function releaseGraphics(error){
  if(error)console.warn('Rebuilding JEV visualization',error);
  ready=false;
  const previousRenderer=renderer;renderer=null;
  for(const resource of [clouds,brain,controls]){try{resource?.dispose();}catch(error){console.warn('Scene cleanup failed',error);}}
  clouds=null;brain=null;controls=null;camera=null;scene=null;layoutCamera=null;cameraFlight=null;
  releaseRenderer(previousRenderer);
  packed=null;layoutSignature='';packedViewport='';worldPositions.clear();radii.clear();
  flowCache=null;filteredFlow=null;narrow=null;last=0;frames=0;statsAt=performance.now();lastMatrix='';badgesDirty=true;
  for(const key of Object.keys(frameCost))frameCost[key]=0;
  host.dataset.particles='0';host.dataset.fps='0';
 }
 const recovery=createRenderRecovery({
  start:(generation,fallback)=>{void init(generation,fallback);},stop:releaseGraphics,
  active:()=>!disposed&&!document.hidden&&tokens.length>0,
  onState:({state,generation})=>{
   host.dataset.renderState=state;host.dataset.renderGeneration=String(generation);
   host.dataset.ready=String(state==='ready');
   if(state==='waiting'||state==='ready')onError(state!=='ready');
  }
 });
 const recoveryTimer=setInterval(()=>recovery.poll(!paused),1000);
 const observer=new ResizeObserver(resize);observer.observe(host);
 async function init(generation,forceWebGL){let instance;try{
  instance=new THREE.WebGPURenderer({antialias:true,forceWebGL});renderer=instance;
  instance.onDeviceLost=info=>recovery.fail(generation,new Error('Graphics device/context lost: '+info.message));
  instance.onError=info=>recovery.fail(generation,new Error('Graphics backend error: '+info.message));
  instance.setPixelRatio(Math.min(devicePixelRatio,1.5));instance.setClearColor('#030809');host.append(instance.domElement);
  await instance.init();
  if(!recovery.current(generation)||renderer!==instance){releaseRenderer(instance);return;}
  // Three ignores a device destroyed externally. A current lost device still
  // needs replacement; our own disposal is excluded by the generation guard.
  instance.backend.device?.lost.then(info=>{
   if(recovery.current(generation)&&renderer===instance)recovery.fail(generation,new Error('GPU device lost: '+info.reason));
  });
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(30,1,.1,100);camera.position.set(3,5,8);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enableRotate=false;controls.screenSpacePanning=true;controls.minDistance=2;controls.maxDistance=20;resize();
  brain=createNeuralBrain(scene,host,centers,()=>tokens,onBrainInspect,t=>radii.get(tokenKey(t))??tokenAppearance(t).radius,trading);placeBrain();brain.setSources(sources);brain.setCohort(routingKeys);
  clouds=createObservationClouds(scene,renderer,host,brain,tokens.map(tokenKey));brain.connect(()=>{const f=clouds.flow();if(f!==flowCache){flowCache=f;filteredFlow={...f,active:f.active.filter(r=>routingSet.has(r.datum.tokenKey))};}return filteredFlow;});
  clouds.setTokens(routingKeys);
  ready=true;sync();host.dataset.backend=renderer.backend.isWebGPUBackend?'WebGPU':'WebGL2';
  await instance.setAnimationLoop(now=>{if(!recovery.current(generation)||document.hidden){last=now;statsAt=now;frames=0;return;}try{
   if(now-capPaintAt>=32){capPaintAt=now;for(const [key,motion] of capMotions){const b=badgeMap.get(key),label=b?.lastElementChild?.lastElementChild;if(!label)continue;const active=motion.active(now);if(active||label.dataset.updating==='true'){label.textContent=compactCap(motion.at(now));label.dataset.updating=String(active);}}}
   const elapsed=Math.min((now-(last||now))/1000,.15);last=now;
   if(cameraFlight){const t=Math.min(1,(now-cameraFlight.start)/600),ease=1-(1-t)**3;controls.target.lerpVectors(cameraFlight.from,cameraFlight.to,ease);camera.position.lerpVectors(cameraFlight.eye,cameraFlight.end,ease);if(t===1)cameraFlight=null;}
   controls.update();const r=host.getBoundingClientRect();
   const gap=now-(momentumAt||now);momentumAt=now;if(paused||gap>1000)momentum.defer(paused?gap:gap-16);
   const arrivals=momentum.frame(now);momentumFrame=new Map(arrivals.map(item=>[item.key,item]));
   const nextStage=arrivals.map(item=>item.key+':'+(item.progress>0)).join('|');if(nextStage!==stageSignature){stageSignature=nextStage;layout(true);}
   // Preserve each identity's current position and ease towards the new packing.
   // Repeated captures may retarget it but cannot teleport it to that target.
   movingKeys.clear();const follow=reduced.matches?1:1-Math.exp(-Math.min(elapsed,.05)*5);
   const stepLimit=unproject(0,0).distanceTo(unproject(1,0))*300*Math.min(elapsed,.05);
   tokens.forEach((token,i)=>{const key=tokenKey(token),target=worldPositions.get(key);if(!target||momentumFrame.has(key)||paused)return;const distance=centers[i].distanceTo(target);if(distance<.00003)return;centers[i].lerp(target,reduced.matches?1:Math.min(follow,stepLimit/distance));movingKeys.add(key);badgesDirty=true;});
   const anchors=sceneAnchors(fieldWidth,fieldHeight,narrow);stagedLast=new Set();
   for(const item of arrivals){const i=tokens.findIndex(t=>tokenKey(t)===item.key);if(i<0)continue;
    const x=narrow?(item.slot+.5)*fieldWidth/4:fieldWidth*.482;
    const y=narrow?anchors.trading.y+anchors.trading.height+53:142+item.slot*Math.max(94,(anchors.trading.y-180)/4);
    const t=reduced.matches?(item.progress===1?1:0):item.progress,ease=t*t*(3-2*t);
    const position=unproject(x,y).lerp(worldPositions.get(item.key)??unproject(x,y),ease);if(!centers[i].equals(position))movingKeys.add(item.key);centers[i].copy(position);stagedLast.add(item.key);
    if(item.progress===1)arriving.set(item.key,Date.now()+TOKEN_NEW_MARK_MS);
   }
   if(arrivals.length||stagedLast.size)badgesDirty=true;
   momentumHeading.dataset.active=String(momentum.pending()>0);host.dataset.momentum=String(arrivals.length);
   const t0=performance.now();clouds.retarget(movingKeys);clouds.update(elapsed,camera,r.width,r.height,paused,reduced.matches);const t1=performance.now();brain.update(elapsed,camera,r.width,r.height,paused,reduced.matches);const t2=performance.now();
   const matrix=camera.matrixWorld.elements.join(',')+':'+r.width+':'+r.height;if(badgesDirty||matrix!==lastMatrix){lastMatrix=matrix;badgesDirty=false;
   cameraRight.setFromMatrixColumn(camera.matrixWorld,0);
   const labels=[];
   badges.forEach((b,i)=>{projected.copy(centers[i]).project(camera);const screenX=(projected.x+1)*r.width/2,stage=momentumFrame.get(tokenKey(tokens[i]));b.dataset.momentum=stage?'true':'false';const hidden=momentum.waiting(tokenKey(tokens[i]))||!stage&&(!!cohortSet&&!cohortSet.has(tokenKey(tokens[i]))||Math.abs(projected.z)>1||Math.abs(projected.y)>1||screenX<(view==='global'?0:(currentBounds?.[0].x??0)+30)||screenX>r.width-(view==='global'?0:30));if(b.hidden!==hidden)b.hidden=hidden;const left=screenX.toFixed(2)+'px',top=((-projected.y+1)*r.height/2).toFixed(2)+'px';if(b.style.left!==left)b.style.left=left;if(b.style.top!==top)b.style.top=top;
    // Nuclei have market-cap radii in the same world as their particle targets.
    // Zoom enlarges both together; dense global views do not retain huge DOM logos.
    edge.copy(centers[i]).addScaledVector(cameraRight,radii.get(tokenKey(tokens[i]))??tokenAppearance(tokens[i]).radius).project(camera);
    let diameter=THREE.MathUtils.clamp(Math.hypot((edge.x-projected.x)*r.width,(edge.y-projected.y)*r.height),1,150).toFixed(2)+'px';
    if(stage)diameter=(46*(1-stage.progress)+parseFloat(diameter)*stage.progress).toFixed(2)+'px';
    if(b.style.getPropertyValue('--nucleus-size')!==diameter)b.style.setProperty('--nucleus-size',diameter);
    if(!hidden&&(arriving.get(tokenKey(tokens[i]))??0)>Date.now())labels.push({key:tokenKey(tokens[i]),time:timelineTime(tokens[i]),x:parseFloat(left),y:parseFloat(top),radius:parseFloat(diameter)/2+30*(view==='global'?packed.labelScale:1)});
   });
   const textVisible=placeNewLabels(labels);badges.forEach(b=>{b.dataset.newLabel=String(textVisible.has(b.dataset.tokenKey));});}
   const t3=performance.now();renderer.render(scene,camera);const t4=performance.now();recovery.frame(generation);frameCost.clouds+=t1-t0;frameCost.brain+=t2-t1;frameCost.badges+=t3-t2;frameCost.render+=t4-t3;frames++;if(now-statsAt>=2000){host.dataset.fps=String(Math.round(frames*1000/(now-statsAt)));host.dataset.frameCosts=JSON.stringify(Object.fromEntries(Object.entries(frameCost).map(([key,value])=>[key,+(value/frames).toFixed(2)])));Object.keys(frameCost).forEach(key=>frameCost[key]=0);host.dataset.attractors=String(tokens.length);statsAt=now;frames=0;}
   for(const badge of leavingBadges){const opacity=String(Math.min(1,Math.max(0,(badge.exitAt-Date.now())/1000)));if(badge.el.style.opacity!==opacity)badge.el.style.opacity=opacity;}
   for(const [key,until] of arriving)if(Date.now()>=until){arriving.delete(key);const badge=badgeMap.get(key);if(badge)badge.dataset.arriving='false';badgesDirty=true;}
  }catch(error){recovery.fail(generation,error);}});
 }catch(error){if(!recovery.fail(generation,error))releaseRenderer(instance);}}
 function highlightTokens(keys){momentum.add(keys);const until=Infinity;for(const key of keys){arriving.set(key,until);const b=badgeMap.get(key);if(b)b.dataset.arriving='true';}layout();}
 function revealToken(key){if(view==='global'){frameCamera();controls?.update();badgesDirty=true;return;}const p=packed?.points.get(key);if(!p||!camera)return;cameraFlight=null;const bound=currentBounds[0];moveTimeline(p.x-bound.x-bound.width*.4);focusAnchor=key;focusFraction=.4;}
 function setSelected(key){focusAnchor=key;const p=packed?.points.get(key);if(p)focusFraction=THREE.MathUtils.clamp((p.x-timelineOffset-currentBounds[0].x)/currentBounds[0].width,.15,.85);}
 return {isReady:()=>recovery.isReady(),setAssetLoading(value){assetsEnabled=value;pumpImages();},highlightTokens,revealToken,setSelected,setMode(mode){if(view===mode)return;view=mode;packed=null;focusAnchor=null;timelineOffset=0;layoutSignature='';if(camera){frameCamera();controls?.update();}layout(true);},setTracked(keys){trackedKeys=new Set(keys);for(const [key,b] of badgeMap)b.dataset.socialTracked=String(trackedKeys.has(key));},setSources(next){sources=next;brain?.setSources(next);},setCohort(keys){if(cohortSet?.size===keys.length&&keys.every(key=>cohortSet.has(key)))return;cohort=keys;cohortSet=new Set(keys);layoutSignature='';flowCache=null;layout(true);},setTokens(next){tokens=next.slice(0,ATTRACTOR_COUNT);layout();recovery.start();sync();},ingest(route){if(recovery.isReady()&&clouds)clouds.ingest(route);},selectDatum(datum){clouds?.select(datum);},resetView(){if(!camera)return;cameraFlight=null;moveTimeline(0);},pause(value){paused=value;host.dataset.paused=String(value);},dispose(){disposed=true;clearInterval(recoveryTimer);recovery.dispose();timelineHint.remove();timelineNav.remove();momentumHeading.remove();imageObserver.disconnect();imageQueue.clear();for(const [img,timer] of imageRequests){clearTimeout(timer);img.onload=null;img.onerror=null;img.removeAttribute('src');}imageRequests.clear();observer.disconnect();badges.forEach(b=>b.remove());}};
}
