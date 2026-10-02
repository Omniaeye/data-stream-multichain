import * as THREE from 'three';
import {createRenderRecovery} from './render-recovery.js';
import {canonicalChain,tokenKey} from './token-selection.js';
const colors={solana:'#a69cff',bsc:'#e9bb61',robinhood:'#b9ef74'};
// Same paired, folded hemisphere construction as the JEV sculpture. It depicts
// incoming captures, not model inference or executed trades.
function cortex(theta,phi,side){phi=((phi+Math.PI*2)%(Math.PI*2))*.5-Math.PI/2;const y=Math.cos(theta),r=Math.sin(theta),fold=1+.043*Math.sin(15*theta+2.2*Math.sin(4*phi))+.025*Math.sin(19*phi+2*Math.sin(8*theta))*r;return [side*(.032+1.45*r*Math.cos(phi)*fold*(1+.055*y)),1.04*y*fold+.10,r*Math.sin(phi)*.91*fold+.09*y];}
export function createTrenchesField(host,container){
 let renderer,scene,camera,brain,connections,dust,disposed=false,width=1,height=1,measureAt=0,frames=0,lastPaint=0,highlight=null;
 let options={brain:true,motion:true},targets=new Map(),signatures=new Map(),initialized=false,particles=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),resources=[];
 const retain=o=>(resources.push(o),o);
 const active=()=>!disposed&&!document.hidden;
 const origin=()=>({x:Math.min(125,width*.21),y:height-86});
 function stop(){if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove();renderer=null;}for(const r of resources.splice(0))r.dispose?.();}
 const recovery=createRenderRecovery({active,start:initialize,stop,onState:s=>{host.dataset.state=s.state;host.dataset.generation=String(s.generation);}});
 function initialize(generation){
  try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);
   renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();recovery.fail(generation,new Error('Context lost'));});
   scene=new THREE.Scene();camera=new THREE.OrthographicCamera(0,width,0,-height,-1000,1000);camera.position.z=500;
   brain=new THREE.Group();scene.add(brain);const vertices=[];
   for(const side of [-1,1])for(let band=1;band<15;band++){let previous;for(let step=0;step<=160;step++){const phi=step/160*Math.PI*2,theta=band/15*Math.PI+.072*Math.sin(phi*5+band*1.8)+.037*Math.sin(phi*9-band),p=cortex(theta,phi,side);if(previous)vertices.push(...previous,...p);previous=p;}}
   const surface=retain(new THREE.BufferGeometry());surface.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
   const lines=new THREE.LineSegments(surface,retain(new THREE.LineBasicMaterial({color:'#8da1c0',transparent:true,opacity:.2,depthWrite:false})));brain.add(lines);
   const points=new THREE.Points(surface,retain(new THREE.PointsMaterial({color:'#b0bad2',size:.9,sizeAttenuation:false,transparent:true,opacity:.26,depthWrite:false})));brain.add(points);brain.scale.setScalar(43);
   const stemCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.65,-.35),new THREE.Vector3(.02,-1.05,-.3),new THREE.Vector3(.13,-1.33,-.18)]);
   brain.add(new THREE.Mesh(retain(new THREE.TubeGeometry(stemCurve,18,.095,7,false)),retain(new THREE.MeshBasicMaterial({color:'#8da1c0',transparent:true,opacity:.12,wireframe:true,depthWrite:false}))));
   const connectionGeometry=retain(new THREE.BufferGeometry());connectionGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(900*24*3),3));connectionGeometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(900*24*3),3));
   connections=new THREE.LineSegments(connectionGeometry,retain(new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.28,depthWrite:false})));connections.frustumCulled=false;scene.add(connections);
   const dustGeo=retain(new THREE.BufferGeometry());dustGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(1200*3),3));dustGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(1200*3),3));
   dust=new THREE.Points(dustGeo,retain(new THREE.PointsMaterial({size:1.7,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.8,depthWrite:false})));dust.frustumCulled=false;scene.add(dust);resize();measure();
   renderer.setAnimationLoop(time=>{
    if(!recovery.current(generation)||!active())return;
    try{
     if(time-lastPaint<1000/(reduced.matches?12:40)){recovery.frame(generation);return;}lastPaint=time;
     if(time-measureAt>240){measure();measureAt=time;}
     const o=origin();brain.position.set(o.x,-o.y,-20);brain.visible=options.brain;brain.rotation.y=options.motion&&!reduced.matches?.35+Math.sin(time*.0001)*.15:.35;brain.rotation.x=.12;
     particles=particles.filter(p=>time-p.at<4800&&targets.has(p.key));const pos=dust.geometry.attributes.position,col=dust.geometry.attributes.color;let n=0;
     if(options.motion&&!reduced.matches)for(const p of particles){const t=(time-p.at)/4800;if(t<0)continue;const to=targets.get(p.key);const start=options.brain?o:{x:12,y:to.y};const bend=Math.sin(t*Math.PI)*(20+p.seed*38),x=start.x+(to.x-start.x)*t,y=start.y+(to.y-start.y)*t-bend;pos.setXYZ(n,x,-y,p.seed*4);const c=new THREE.Color(p.color);col.setXYZ(n,c.r,c.g,c.b);n++;}
     dust.geometry.setDrawRange(0,n);pos.needsUpdate=true;col.needsUpdate=true;renderer.render(scene,camera);recovery.frame(generation);host.dataset.frames=String(++frames);host.dataset.particles=String(n);host.dataset.tokens=String(targets.size);
    }catch(error){recovery.fail(generation,error);}
   });
  }catch(error){recovery.fail(generation,error);}
 }
 function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);if(!renderer)return;renderer.setSize(width,height,false);camera.right=width;camera.bottom=-height;camera.updateProjectionMatrix();measureAt=0;}
 function measure(){
  if(!connections)return;const rect=host.getBoundingClientRect(),visible=container.getBoundingClientRect(),next=new Map(),vertices=[],tones=[];
  for(const el of container.querySelectorAll('.tr-orb')){const r=el.getBoundingClientRect();if(r.top+30<visible.top||r.top+30>visible.bottom)continue;const p={x:r.left+r.width/2-rect.left,y:r.top+30-rect.top},key=el.dataset.tokenKey;next.set(key,p);
   const group=el.closest('.tr-field-group'),anchor=group?.querySelector('.tr-source-anchor');if(!anchor||el.dataset.direct!=='true')continue;const a=anchor.getBoundingClientRect(),from={x:Math.min(a.right-rect.left+4,p.x-45),y:a.top+30-rect.top};const color=new THREE.Color(highlight===key?'#e3e6f4':colors[el.dataset.chain]??'#7a879b');
   for(let s=0;s<12;s++){const t=s/12,u=(s+1)/12;vertices.push(from.x+(p.x-from.x)*t,-(from.y+(p.y-from.y)*t-Math.sin(t*Math.PI)*12),-5,from.x+(p.x-from.x)*u,-(from.y+(p.y-from.y)*u-Math.sin(u*Math.PI)*12),-5);tones.push(color.r,color.g,color.b,color.r,color.g,color.b);}
  }
  targets=next;const position=connections.geometry.attributes.position,color=connections.geometry.attributes.color;position.array.set(vertices.slice(0,position.array.length));color.array.set(tones.slice(0,color.array.length));position.needsUpdate=true;color.needsUpdate=true;connections.geometry.setDrawRange(0,Math.min(vertices.length/3,position.count));
 }
 const observer=new ResizeObserver(resize);observer.observe(host);const onScroll=()=>{measureAt=0;};container.addEventListener('scroll',onScroll,true);
 const watchdog=setInterval(()=>recovery.poll(true),1000);recovery.start();
 return {update(tokens,nextOptions,selected){options=nextOptions;highlight=selected;const now=performance.now(),next=new Map();for(const token of tokens){const key=tokenKey(token),signature=token.evidence?.captureId??'';next.set(key,signature);if(initialized&&targets.has(key)&&signature&&signatures.get(key)!==signature&&options.motion){for(let i=0;i<Math.min(8,token.fields.length);i++)particles.push({key,at:now+i*1500,seed:(i+1)/8,color:colors[canonicalChain(token.chain)]??'#a8b3c5'});}}particles=particles.slice(-1200);signatures=next;if(tokens.length)initialized=true;measureAt=0;},dispose(){disposed=true;clearInterval(watchdog);observer.disconnect();container.removeEventListener('scroll',onScroll,true);recovery.dispose();}};
}
