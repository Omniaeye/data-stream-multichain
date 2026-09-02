import * as THREE from 'three/webgpu';
import {instancedBufferAttribute,float} from 'three/tsl';
import {tokenKey} from './token-selection.js';
import {observationSeed} from './observation-organisms.js';
import {familyFor} from './field-families.js';
import {tokenAppearance} from './token-appearance.js';
import {createFlowRibbons} from './flow-ribbons.js';
import {chainMark} from './network-marks.js';
import {createBrainTitles,BRAIN_TITLE_LIMIT} from './brain-titles.js';
import {activeTradingPulses} from './trading-pulses.js';

// A data-routing sculpture, not a depiction of model inference or trading.
 const ORIGIN=new THREE.Vector3(-1,0,0);
const REGIONS={
 market:{label:'Market',color:'#77e5cc',point:[-.60,.57,.45]},
 holders:{label:'Holders',color:'#8caeff',point:[.62,.58,.35]},
 risk:{label:'Risk',color:'#efc58e',point:[-.69,-.37,.40]},
 identity:{label:'Identity',color:'#a69bef',point:[.68,-.37,.40]},
 social:{label:'Social',color:'#edb5cd',point:[0,.08,.70]},
 other:{label:'Other fields',color:'#aebbc2',point:[0,-.80,.25]}
};
const CHAINS=['robinhood','bsc','solana'];
const SOURCE_COLORS={robinhood:'#7be4c6',bsc:'#edcc8c',solana:'#b6a5ed'};

const random=(()=>{let state=94177;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};})();

// Paired folded hemispheres with a central fissure. Not an anatomical model.
function cortex(theta,phi,side,depth=1){
 phi=((phi+Math.PI*2)%(Math.PI*2))*.5-Math.PI/2;
 const sy=Math.cos(theta),rad=Math.sin(theta),sx=rad*Math.cos(phi),sz=rad*Math.sin(phi);
 const fold=1+.043*Math.sin(15*theta+2.2*Math.sin(4*phi))
   +.025*Math.sin(19*phi+2*Math.sin(8*theta))*rad;
 const y=1.04*sy*depth*fold;
 return new THREE.Vector3(side*(.032+1.45*sx*depth*fold*(1+.055*sy)),y+.10,
  sz*.91*depth*fold+.09*sy);
}

export function createNeuralBrain(scene,host,centers,getTokens,onInspect,getRadius=t=>tokenAppearance(t).radius){
 const resources=[],dom=[],group=new THREE.Group();group.position.copy(ORIGIN);scene.add(group);
 const track=r=>(resources.push(r),r),latest={},zoneTotals={};
 let getFlow=()=>({received:0,delivered:0,inFlight:0,pending:0,visible:0,other:0,changed:0,unverified:0,retired:0,retained:0,resident:0,active:[],selected:null});
 const regionPoints=Object.fromEntries(Object.entries(REGIONS).map(([key,r])=>[key,new THREE.Vector3(...r.point).add(ORIGIN)]));
 const ports=CHAINS.map((_,i)=>new THREE.Vector3(-4.85,(1-i)*.95,0));
 const ribbons=createFlowRibbons(scene,ports,regionPoints);
 const others=CHAINS.map((_,i)=>new THREE.Vector3(4.65,-2.55-i*.27,0));
 let brainScale=1,compactLayout=false,disposed=false,reportClock=0,tagClock=0,labelClock=0,lastDatum=null,tokenMap=new Map();const destinations=new Map();
 function refreshTokens(){tokenMap=new Map(getTokens().map((t,i)=>[tokenKey(t),{token:t,index:i}]));for(const [key,{index}] of tokenMap)destinations.set(key,centers[index].clone());}
 refreshTokens();
 const projected=new THREE.Vector3();
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.12,'#e5fffa');gradient.addColorStop(.35,'#8bddd988');gradient.addColorStop(1,'#80d8d000');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const glow=track(new THREE.CanvasTexture(canvas));
 function lineSegments(vertices,color,opacity,parent=group){
  const geometry=track(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const material=track(new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));
  const lines=new THREE.LineSegments(geometry,material);parent.add(lines);return lines;
 }
 function points(vertices,color,size,opacity,parent=group){
  const position=new THREE.InstancedBufferAttribute(new Float32Array(vertices),3);
  const geometry=track(new THREE.PlaneGeometry(1,1));geometry.setAttribute('observationPosition',position);
  const material=track(new THREE.SpriteNodeMaterial({map:glow,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));
  material.positionNode=instancedBufferAttribute(position);material.scaleNode=float(size);
  const cloud=new THREE.InstancedMesh(geometry,material,vertices.length/3);cloud.frustumCulled=false;parent.add(cloud);return cloud;
 }
 const shell=track(new THREE.MeshPhysicalMaterial({color:'#4f928b',emissive:'#102d28',emissiveIntensity:.24,
  metalness:.06,roughness:.6,clearcoat:.25,transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide}));
 const folds=[],surface=[],neurons=[];
 for(const side of [-1,1]){
  const geometry=track(new THREE.SphereGeometry(1,72,48));
  const position=geometry.getAttribute('position');
  for(let i=0;i<position.count;i++){
   const theta=Math.acos(THREE.MathUtils.clamp(position.getY(i),-1,1));
   const phi=Math.atan2(position.getZ(i),position.getX(i));const p=cortex(theta,phi,side);
   position.setXYZ(i,p.x,p.y,p.z);
  }
  geometry.computeVertexNormals();group.add(new THREE.Mesh(geometry,shell));
  // Meandering gyri on the transparent cortex, combined into one draw call.
  for(let band=1;band<15;band++){
   let prev;
   for(let step=0;step<=220;step++){
    const phi=step/220*Math.PI*2;
    const theta=band/15*Math.PI+.072*Math.sin(phi*5+band*1.8)+.037*Math.sin(phi*9-band);
    const p=cortex(theta,phi,side,1.008);
    if(prev)folds.push(...prev.toArray(),...p.toArray());prev=p;
   }
  }
  for(let i=0;i<1500;i++){
   const theta=Math.acos(1-2*random()),phi=random()*Math.PI*2;
   surface.push(...cortex(theta,phi,side,1.006).toArray());
  }
  for(let i=0;i<230;i++){
   neurons.push(cortex(Math.acos(1-2*random()),random()*Math.PI*2,side,.92*Math.cbrt(random())));
  }
 }
 lineSegments(folds,'#69b8a7',.17);points(surface,'#75b8a7',.012,.23);
 points(neurons.flatMap(p=>p.toArray()),'#a9e3cf',.026,.42);
 const synapses=[],neuralEdges=[];
 for(let i=0;i<neurons.length;i++){
  const nearby=neurons.map((p,j)=>({j,d:p.distanceToSquared(neurons[i])})).filter(x=>x.j!==i&&x.d<.24).sort((a,b)=>a.d-b.d).slice(0,3);
  for(const {j} of nearby)if(j>i){synapses.push(...neurons[i].toArray(),...neurons[j].toArray());neuralEdges.push([neurons[i],neurons[j]]);}
 }
 lineSegments(synapses,'#75bcac',.075);
 const zoneEdges=Object.fromEntries(Object.keys(REGIONS).map(key=>[key,[]]));
 for(const edge of neuralEdges){const mid=edge[0].clone().add(edge[1]).multiplyScalar(.5);let nearest='other',distance=Infinity;for(const [key,region] of Object.entries(REGIONS)){const d=mid.distanceToSquared(new THREE.Vector3(...region.point));if(d<distance){nearest=key;distance=d;}}zoneEdges[nearest].push(edge);}
 // Light only pathways belonging to observations currently inside the brain.
 const pulses=points(new Array(48*3).fill(0),'#c2ffe1',.064,.78);pulses.count=0;
 const pulsePosition=pulses.geometry.getAttribute('observationPosition');
 // Inter-hemisphere fibers visibly cross the central fissure.
 const fibers=[];
 for(let i=0;i<16;i++){
  const h=(i/16-.5)*1.25,z=Math.sin(i*2.4)*.48;
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.8,h,z),new THREE.Vector3(-.30,h+.2,z),new THREE.Vector3(.3,h+.2,z),new THREE.Vector3(.8,h,z)]);
  const pts=curve.getPoints(32);for(let j=1;j<pts.length;j++)fibers.push(...pts[j-1].toArray(),...pts[j].toArray());
 }
 lineSegments(fibers,'#8c9dbe',.09);
 // A small transparent stem gives the silhouette a readable lower contour.
 const stemCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.65,-.35),new THREE.Vector3(.02,-1.05,-.3),new THREE.Vector3(.13,-1.33,-.18)]);
 group.add(new THREE.Mesh(track(new THREE.TubeGeometry(stemCurve,28,.095,9,false)),shell));
 const rimLight=new THREE.DirectionalLight('#92eede',3);rimLight.position.set(-3,4,5);scene.add(rimLight);
 const fill=new THREE.DirectionalLight('#7686ce',2);fill.position.set(3,1,-2);scene.add(fill);
 const ambient=new THREE.AmbientLight('#6aa4a1',1.3);scene.add(ambient);

 function label(text,position,className,click){
  const el=document.createElement(click?'button':'span');el.className='brain-label '+className;el.textContent=text;
  if(click)el.onclick=click;host.append(el);dom.push({el,position});return el;
 }
 const regionLabels={},hubs={};
 for(const [key,r] of Object.entries(REGIONS)){
  const p=regionPoints[key];hubs[key]=points(p.toArray(),'#a2e2d3',.26,0,scene);
  const el=label(r.label,p.clone().add(new THREE.Vector3(0,.20,.12)),'brain-region',()=>onInspect(key,inspection(key)));
  el.style.setProperty('--region-color',r.color);el.setAttribute('aria-label','Inspect '+r.label+' routing');
  if(key==='other')el.hidden=true;regionLabels[key]=el;
 }
 const portLabels=CHAINS.map((chain,i)=>{const el=label('',ports[i].clone(),'brain-port');const img=document.createElement('img');img.src=chainMark(chain);img.alt=chain==='robinhood'?'Robinhood Chain':chain==='bsc'?'BSC':'Solana';const name=document.createElement('span');name.textContent=img.alt;el.append(img,name);return el;});
 const tradingTitle=label('JEV TRADING AI · SOON',ORIGIN.clone().add(new THREE.Vector3(0,1.30,0)),'brain-trading-title');
 const caption=label('JEV NEURAL',ORIGIN.clone().add(new THREE.Vector3(0,-1.9,0)),'brain-title',()=>onInspect(null,inspection()));
 caption.setAttribute('aria-label','Inspect brain data flow');
 const otherLabel=label('',new THREE.Vector3(4.65,-3.5,0),'brain-other',()=>onInspect(null,inspection()));
 otherLabel.title='Additional token destinations, grouped spatially by network. Every organism keeps its exact token identity.';
 const trace=label('NEURAL ACTIVITY',ORIGIN.clone().add(new THREE.Vector3(0,-2.21,0)),'brain-trace');
 const routeLabel=label('',ORIGIN.clone().add(new THREE.Vector3(0,1.68,0)),'brain-route');
 const titles=createBrainTitles();let activeTitles=Array(BRAIN_TITLE_LIMIT).fill(null);
 const chips=Array.from({length:BRAIN_TITLE_LIMIT},(_,i)=>{
  const position=ORIGIN.clone(),chip={el:null,position,datum:null,born:-100,slot:i};
  chip.el=label('',position,'brain-chip',()=>{if(chip.datum)onInspect(chip.datum.zone,{...inspection(chip.datum.zone),latest:chip.datum,activeRoute:true});});
  return chip;
 });
 const tradingChips=Array.from({length:7},(_,slot)=>{
  const position=ORIGIN.clone(),chip={el:null,position,slot};
  chip.el=label('',position,'brain-trading-pulse');
  chip.el.setAttribute('aria-hidden','true');
  return chip;
 });
 const portsPositions=ports.concat(others).flatMap(p=>p.toArray());const portDots=points(portsPositions,'#83bdb7',.12,0,scene);

 // The brain supplies anchors only. Observation clouds render the whole journey.
 function inspection(zone){
  const flow=getFlow(),current=flow.active.find(record=>(!zone||record.datum.zone===zone));
  return {...flow,zone:zone??null,zoneCount:zone?zoneTotals[zone]??0:null,
   activeRoute:!!current,latest:current?.datum??(zone?latest[zone]??null:lastDatum)};
 }
 function pathFor(datum){
  const index=tokenMap.get(datum.tokenKey)?.index??-1,chainIndex=Math.max(0,CHAINS.indexOf(datum.chain));
  const region=regionPoints[datum.zone]??regionPoints.other;
  const seed=observationSeed(datum.tokenKey),angle=seed*Math.PI*2,radius=.15+observationSeed(datum.tokenKey+':radius')*.55;
  const end=index<0?(destinations.get(datum.tokenKey)??others[chainIndex].clone().add(new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,Math.sin(angle*3)*.25))):centers[index];
  const spread=observationSeed(datum.id+':relay')-.5;
  const entry=region.clone().add(new THREE.Vector3(spread*.32,Math.sin(seed*37)*.16,spread*.4).multiplyScalar(brainScale));
  const relay=compactLayout?new THREE.Vector3(group.position.x+spread*.9*brainScale,group.position.y-.65*brainScale,.12+spread*.5):new THREE.Vector3(group.position.x+.75*brainScale,group.position.y+(region.y-group.position.y)*.5+spread*.45*brainScale,.12+spread*.5);
  return [ribbons.source(datum,observationSeed(datum.id),compactLayout),entry,relay,end];
 }
 return {
  refreshTokens,
  setSources(sources){ribbons.setSources(sources);},
  setCohort(keys){ribbons.setTokens(keys);activeTitles=titles.restrict(keys);chips.forEach(chip=>{if(!activeTitles[chip.slot]){chip.datum=null;chip.el.style.opacity='0';chip.el.style.pointerEvents='none';}});},
  radiusFor(datum){const token=tokenMap.get(datum.tokenKey)?.token;return token?getRadius(token):.06;},
  resize(compact,anchors=null){
   compactLayout=compact;
   host.dataset.brainLayout=compact?'vertical':'horizontal';
   const origin=anchors?.origin??(compact?new THREE.Vector3(0,.40,0):ORIGIN);
   group.position.copy(origin);brainScale=anchors?.scale??1;group.scale.setScalar(brainScale);
   function moveLabel(el,position){dom.find(item=>item.el===el).position.copy(position);}
   for(const [key,r] of Object.entries(REGIONS)){
    regionPoints[key].set(...r.point).multiplyScalar(brainScale).add(origin);
    const attribute=hubs[key].geometry.getAttribute('observationPosition');attribute.setXYZ(0,...regionPoints[key].toArray());attribute.needsUpdate=true;
    moveLabel(regionLabels[key],regionPoints[key].clone().add(new THREE.Vector3(0,.20,.12)));
   }
   ports.forEach((p,i)=>{if(anchors?.ports)p.copy(anchors.ports[i]);else p.set(compact?(i-1)*1.9:-4.85,compact?3.0:(1-i)*.95,0);moveLabel(portLabels[i],p.clone());});
   others.forEach((p,i)=>p.set(compact?2.6:4.65,compact?-2.8-i*.25:-2.55-i*.27,0));
   const attribute=portDots.geometry.getAttribute('observationPosition');ports.concat(others).forEach((p,i)=>attribute.setXYZ(i,...p.toArray()));attribute.needsUpdate=true;
   moveLabel(caption,origin.clone().add(new THREE.Vector3(0,-1.65,0).multiplyScalar(brainScale)));
   moveLabel(trace,origin.clone().add(new THREE.Vector3(0,-1.90,0).multiplyScalar(brainScale)));
   moveLabel(tradingTitle,origin.clone().add(new THREE.Vector3(0,1.30,0).multiplyScalar(brainScale)));
   moveLabel(routeLabel,origin.clone().add(new THREE.Vector3(0,1.68,0).multiplyScalar(brainScale)));
   moveLabel(otherLabel,new THREE.Vector3(compact?2.25:4.65,compact?-3.80:-3.5,0));

  },
  pathFor,
  connect(provider){getFlow=provider;},
  ingest(route){if(disposed)return;ribbons.ingest(route.rows);for(const row of route.rows){zoneTotals[row.zone]=(zoneTotals[row.zone]??0)+1;latest[row.zone]=row;lastDatum=row;}},
  update(dt,camera,width,height,frozen=false){
   if(disposed)return;
   if(!frozen)tagClock+=dt;labelClock+=dt;ribbons.update(frozen?0:dt,compactLayout);
   const flow=getFlow(),lit={};
   const active=flow.active.slice(0,48);pulses.count=active.length;
   active.forEach((record,i)=>{const seed=observationSeed(record.datum.id),edges=zoneEdges[record.datum.zone]?.length?zoneEdges[record.datum.zone]:neuralEdges,edge=edges[Math.floor(seed*edges.length)],t=frozen?.5:(tagClock*1.4+seed)%1;projected.lerpVectors(edge[0],edge[1],t);pulsePosition.setXYZ(i,projected.x,projected.y,projected.z);});
   if(active.length)pulsePosition.needsUpdate=true;
   if(labelClock>=.2){labelClock=0;
   for(const record of flow.active)lit[record.datum.zone]=true;
   const atBrain=flow.active.find(record=>record.datum.id===flow.selected)?.datum??flow.active[0]?.datum;
   routeLabel.textContent=atBrain?`${atBrain.field.key}: ${String(atBrain.field.value).slice(0,22)} → ${atBrain.tokenName}`:'';
   host.dataset.brainRoute=atBrain?JSON.stringify({id:atBrain.id,zone:atBrain.zone,destination:atBrain.tokenKey,count:1,captureId:atBrain.captureId}):'';
   for(const [key,el] of Object.entries(regionLabels)){
    el.dataset.active=String(!!lit[key]);el.title=zoneTotals[key]?`${zoneTotals[key].toLocaleString()} received fields · ${REGIONS[key].label}`:REGIONS[key].label;
    const families=[...new Map(flow.active.filter(record=>record.datum.zone===key).map(record=>{const family=familyFor(record.datum.field.key);return [family.id,family];})).values()];
    const activeFamily=families[Math.floor(tagClock/2)%families.length];
    el.textContent='';
    el.style.setProperty('--region-color',activeFamily?.color??REGIONS[key].color);
    hubs[key].material.opacity=lit[key]?.08:0;
   }
   }
   const centerProjection=group.position.clone().project(camera),unitProjection=group.position.clone().add(new THREE.Vector3(1,0,0)).project(camera);
   const pixelsPerUnit=Math.max(1,Math.abs(unitProjection.x-centerProjection.x)*width/2)*brainScale;
   const titlePixels=window.innerWidth<=600?8:window.innerWidth<=900?9:10;
   activeTitles=titles.update(flow.active,tagClock,width<500?5:8,{charWidth:titlePixels*.68/pixelsPerUnit,lineHeight:titlePixels*1.65/pixelsPerUnit+.04});
   const labels=activeTitles;
   for(const chip of chips){
    const title=labels[chip.slot];
    chip.datum=title?.datum??null;
    if(title){chip.el.textContent=title.family.label;chip.el.style.setProperty('--region-color',title.family.color);chip.el.dataset.datumId=title.datum.id;}
    const age=title?tagClock-title.born:0,opacity=title?Math.min(1,frozen?1:age/.12,Math.max(0,(title.life-age)/.25)):0;
    if(title){const drift=Math.min(1,age/title.life);chip.position.copy(group.position).add(new THREE.Vector3(...title.position).multiplyScalar(brainScale));chip.position.x+=Math.sin(title.seed*11)*drift*.035;chip.position.y+=drift*.035;chip.el.dataset.born=String(title.born);chip.el.dataset.life=String(title.life);}
    chip.el.style.opacity=String(opacity);chip.el.style.transform=`translate(-50%,-50%) scale(${title ? .96+title.seed*.12 : 1})`;
    chip.el.style.pointerEvents=opacity>.1?'auto':'none';
   }
   const activePulses=activeTradingPulses(tagClock);
   host.dataset.tradingPulseCycle=String(Math.floor(tagClock/30));
   for(const chip of tradingChips){
    const pulse=activePulses.find(item=>item.index===chip.slot);
    const opacity=pulse?Math.min(1,pulse.age/.16,Math.max(0,(pulse.life-pulse.age)/.28)):0;
    if(pulse){
     chip.el.textContent=pulse.label;
     chip.el.dataset.action=pulse.label.toLowerCase().replaceAll(' ','-');
     chip.el.dataset.cycle=String(pulse.cycle);
     chip.position.copy(group.position).add(new THREE.Vector3(...pulse.position).multiplyScalar(brainScale));
    }
    chip.el.style.opacity=String(opacity);
    chip.el.style.transform=`translate(-50%,-50%) scale(${pulse?1.08-pulse.age*.06:1})`;
   }
   for(const {el,position} of dom){
    projected.copy(position).project(camera);const hidden=el===otherLabel||Math.abs(projected.z)>1||Math.abs(projected.x)>1.05||Math.abs(projected.y)>1.05||(el===regionLabels.other&&!zoneTotals.other);if(el.hidden!==hidden)el.hidden=hidden;
    const left=((projected.x+1)*width/2).toFixed(2)+'px',top=((-projected.y+1)*height/2).toFixed(2)+'px';if(el.style.left!==left)el.style.left=left;if(el.style.top!==top)el.style.top=top;
   }
   reportClock+=dt;if(reportClock>1){reportClock=0;
    host.dataset.flowShares=JSON.stringify(ribbons.shares());
    host.dataset.brainFields=String(flow.received);host.dataset.brainDelivered=String(flow.delivered);
    host.dataset.brainPending=String(flow.pending+flow.inFlight);host.dataset.brainOtherFields=String(flow.other);
   }
  },
  dispose(){disposed=true;ribbons.dispose();dom.forEach(({el})=>el.remove());resources.forEach(r=>r.dispose());scene.remove(group,rimLight,fill,ambient,portDots,...Object.values(hubs));}
 };
}
