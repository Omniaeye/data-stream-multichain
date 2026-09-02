// Attractor force/TSL compute adapted from three.js (MIT; see THREE-LICENSE.txt).
// https://threejs.org/examples/webgpu_tsl_compute_attractors_particles.html
// Token pulses represent changed values in received snapshots, not individual trades.
import * as THREE from 'three/webgpu';
import {separateLogos} from './logo-layout.js';
import {logoUrl} from './market-activity.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {tokenKey} from './token-selection.js';
import {tokenAppearance,NETWORK_COLORS} from './token-appearance.js';

export function createNetwork(host,initialTokens,onSelect,onError){
 let renderer,controls,scene,camera,cloud,ring,initialized=false,disposed=false,playing=true,selected=0,tokens=initialTokens;
 let last=0,accumulator=0,frames=0,statsAt=0,computeSteps=0,failed=false;
 const resources=[],nuclei=new Map(),pick=[];
 const label=document.createElement('div');label.className='neural-node-label';label.hidden=true;host.appendChild(label);
 const projected=new THREE.Vector3();let focusTarget=null,focusCamera=null;
 const stopFocus=()=>{focusTarget=null;focusCamera=null;};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const observer=new ResizeObserver(()=>resize());observer.observe(host);
 const centers=[new THREE.Vector3(-1.65,0,0),new THREE.Vector3(1.65,.1,-.5),new THREE.Vector3(0,.6,1.7)];
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let pointerStart=null;
 const track=resource=>{resources.push(resource);return resource;};
 const seed=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
 function tokenPosition(token){const h=seed(tokenKey(token)),center=centers[h%3],angle=(h%10000)/10000*Math.PI*2,r=.6+((h>>>8)%1000)/1000*1.4;return new THREE.Vector3(center.x+Math.cos(angle)*r,center.y+(((h>>>18)%1000)/1000-.5)*.8,center.z+Math.sin(angle)*r);}
 function resize(){if(!renderer||!camera)return;const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
 function syncTokens(){
  if(!initialized)return;const keys=new Set(tokens.map(tokenKey));
  for(const [key,mesh] of nuclei)if(!keys.has(key)){scene.remove(mesh);mesh.userData.badge?.remove();nuclei.delete(key);}
  pick.length=0;
  tokens.forEach((token,index)=>{const key=tokenKey(token);let mesh=nuclei.get(key);if(!mesh){mesh=new THREE.Mesh(nucleusGeometry,nucleusMaterials[tokenAppearance(token).color]);mesh.position.copy(tokenPosition(token));const halo=new THREE.Sprite(haloMaterials[tokenAppearance(token).color]);halo.scale.set(5,5,1);halo.raycast=()=>{};mesh.add(halo);const badge=document.createElement('button');badge.className='neural-token-logo';badge.title=token.name+' · '+token.chain;badge.setAttribute('aria-label','Inspect '+token.name+' on '+token.chain);badge.style.borderColor=tokenAppearance(token).color;badge.textContent=token.name.slice(0,3);
     const url=logoUrl(token.logo);if(url){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.src=url;img.onload=()=>{badge.textContent='';badge.appendChild(img);};img.onerror=()=>img.remove();}
     badge.onclick=()=>onSelect(mesh.userData.index);host.appendChild(badge);mesh.userData.badge=badge;
     scene.add(mesh);nuclei.set(key,mesh);}mesh.userData.index=index;mesh.userData.radius=tokenAppearance(token).radius;mesh.userData.targetScale=mesh.userData.radius;if(!mesh.userData.scaled){mesh.scale.setScalar(mesh.userData.targetScale);mesh.userData.scaled=true;}pick.push(mesh);});
  select(selected);
  host.dataset.tokenCount=String(tokens.length);
 }
 function select(index){selected=index;if(!ring)return;const token=tokens[index],target=token&&nuclei.get(tokenKey(token));ring.visible=false;label.hidden=!target;
  if(target){ring.position.copy(target.position);ring.quaternion.copy(camera.quaternion);ring.scale.setScalar((target.scale.x+.065)/.13);
   projected.copy(target.position).project(camera);const r=host.getBoundingClientRect();
   label.hidden=projected.z>1||projected.z< -1||Math.abs(projected.x)>1||Math.abs(projected.y)>1;
   label.textContent=token.name;label.style.left=((projected.x+1)*r.width/2)+'px';label.style.top=((-projected.y+1)*r.height/2-22)+'px';
   host.dataset.selectedToken=tokenKey(token);host.dataset.selectedRadius=target.scale.x.toFixed(4);
  }else{stopFocus();delete host.dataset.selectedToken;delete host.dataset.selectedRadius;}
 }
 function focus(){if(!initialized||!tokens[selected])return;const target=nuclei.get(tokenKey(tokens[selected]));if(!target)return;
  focusTarget=target.position.clone();focusCamera=camera.position.clone().sub(controls.target).normalize().multiplyScalar(4.2).add(focusTarget);host.dataset.focus='token';
 }
 function resetView(){if(!initialized)return;focusTarget=new THREE.Vector3(0,0,.5);focusCamera=new THREE.Vector3(5,6,10);host.dataset.focus='overview';}
 const down=e=>{pointerStart=[e.clientX,e.clientY];};
 const up=e=>{if(!initialized||!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>5)return;const r=host.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(pick)[0];if(hit)onSelect(hit.object.userData.index);};
 host.addEventListener('pointerdown',down);host.addEventListener('pointerup',up);
 let nucleusGeometry,nucleusMaterials,haloMaterials;
 async function init(){
  try{
   renderer=new THREE.WebGPURenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.appendChild(renderer.domElement);
   await renderer.init();if(disposed){renderer.dispose();return;}
   host.dataset.backend=renderer.backend.isWebGPUBackend?'WebGPU':'WebGL2 fallback';
   scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xb9e7e1,0x101527,2));const keyLight=new THREE.DirectionalLight(0xd7f7ed,3.2);keyLight.position.set(-3,6,5);scene.add(keyLight);const rimLight=new THREE.DirectionalLight(0x929fff,2);rimLight.position.set(4,1,-4);scene.add(rimLight);camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(5,6,10);
   controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=4;controls.maxDistance=22;controls.enablePan=false;controls.rotateSpeed=.55;controls.zoomSpeed=.65;controls.enableDamping=!reduced.matches;controls.target.set(0,0,.5);controls.addEventListener('start',stopFocus);
   nucleusGeometry=track(new THREE.SphereGeometry(1,28,20));
   const colors=[...Object.values(NETWORK_COLORS),'#92a6a0'];
   nucleusMaterials=Object.fromEntries(colors.map(c=>[c,track(new THREE.MeshStandardMaterial({color:c,roughness:.38,metalness:.22,emissive:c,emissiveIntensity:.12,transparent:true,opacity:0,depthWrite:false}))]));
   const haloCanvas=document.createElement('canvas');haloCanvas.width=64;haloCanvas.height=64;const ctx=haloCanvas.getContext('2d');
   const gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.35)');gradient.addColorStop(.35,'rgba(255,255,255,.12)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
   const haloTexture=track(new THREE.CanvasTexture(haloCanvas));
   haloMaterials=Object.fromEntries(colors.map(c=>[c,track(new THREE.SpriteMaterial({map:haloTexture,color:c,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}))]));
   ring=new THREE.Mesh(track(new THREE.RingGeometry(.13,.145,48)),track(new THREE.MeshBasicMaterial({color:0xe2ffed,side:THREE.DoubleSide,transparent:true,opacity:.8})));scene.add(ring);
   if(disposed){cleanup();return;}
   initialized=true;syncTokens();resize();host.dataset.particleCount='0';host.dataset.ready='true';
   renderer.setAnimationLoop(now=>{
    if(disposed||failed)return;
    const dt=Math.min((now-(last||now))/1000,.05);last=now;
    if(document.hidden){frames=0;statsAt=now;return;}controls.enableDamping=!reduced.matches;host.dataset.motion=reduced.matches?'reduced':playing?'running':'paused';
    try{
     for(const mesh of nuclei.values()){const next=reduced.matches?mesh.userData.targetScale:THREE.MathUtils.lerp(mesh.scale.x,mesh.userData.targetScale,(!playing?1:1-Math.exp(-dt*6)));mesh.scale.setScalar(next);}
     if(focusTarget){const blend=reduced.matches?1:1-Math.exp(-dt*5);controls.target.lerp(focusTarget,blend);camera.position.lerp(focusCamera,blend);if(camera.position.distanceTo(focusCamera)<.005)stopFocus();}
     controls.update();select(selected);
     const rect=host.getBoundingClientRect(),points=[];
     for(const mesh of nuclei.values()){
      const badge=mesh.userData.badge;projected.copy(mesh.position).project(camera);badge.hidden=Math.abs(projected.x)>1||Math.abs(projected.y)>1||Math.abs(projected.z)>1;
      const size=Math.max(22,Math.min(rect.width<500?40:64,mesh.scale.x*rect.height/(camera.position.distanceTo(mesh.position)*Math.tan(camera.fov*Math.PI/360))));
      if(!badge.hidden)points.push({key:tokenKey(tokens[mesh.userData.index]),mesh,x:(projected.x+1)*rect.width/2,y:(-projected.y+1)*rect.height/2,radius:size/2});badge.setAttribute('aria-pressed',String(mesh.userData.index===selected));badge.style.width=size+'px';badge.style.height=size+'px';badge.style.zIndex=String(Math.round((1-projected.z)*1000));
      const pulse=playing&&!reduced.matches?Math.max(0,((mesh.userData.flashUntil??0)-now)/1600):0;
      badge.style.boxShadow=pulse?`0 0 ${8+pulse*18}px ${tokenAppearance(tokens[mesh.userData.index]).color}`:'0 3px 12px #0007';
     }
     for(const p of separateLogos(points.sort((a,b)=>a.key.localeCompare(b.key)),rect.width,rect.height)){
      p.mesh.userData.badge.style.left=p.x+'px';p.mesh.userData.badge.style.top=p.y+'px';
      if(p.mesh.userData.index===selected){label.hidden=false;label.style.left=p.x+'px';label.style.top=(p.y-p.radius-6)+'px';}
     }
     renderer.render(scene,camera);
     frames++;if(now-statsAt>=1000){host.dataset.fps=String(Math.round(frames*1000/(now-statsAt)));host.dataset.computeSteps=String(computeSteps);frames=0;statsAt=now;}
    }catch{failed=true;renderer.setAnimationLoop(null);onError();}
   });
  }catch{if(!disposed){failed=true;cleanup();onError();}}
 }
 function cleanup(){renderer?.setAnimationLoop(null);controls?.dispose();for(const r of resources)r.dispose();resources.length=0;renderer?.dispose();renderer?.domElement.remove();}
 void init();
 return {pulse(keys){for(const key of keys){const mesh=nuclei.get(key);if(mesh)mesh.userData.flashUntil=performance.now()+1600;}},select,focus,resetView,setPlaying(value){playing=value;host.dataset.playing=String(value);},setTokens(value){tokens=value;syncTokens();},dispose(){disposed=true;observer.disconnect();host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',up);label.remove();for(const mesh of nuclei.values())mesh.userData.badge?.remove();cleanup();}};
}
