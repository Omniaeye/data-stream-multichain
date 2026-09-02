import * as THREE from 'three/webgpu';
import {CATEGORY_ORDER,catmull,sourceOffset} from './flow-path.js';
import {FAMILY_COLORS} from './field-families.js';
import {createCohortTraffic} from './cohort-traffic.js';
const chains=['robinhood','bsc','solana'],zones=['market','holders','risk','identity','social','other'];
const STEPS=24;
// One mesh per network. Width represents received fields/s, not traded dollars.
export function createFlowRibbons(scene,ports,regions){
 const rates=[0,0,0],expires=[0,0,0],widths=[0,0,0],meshes=[],traffic=createCohortTraffic();
 let flowTime=0,snapshot=traffic.snapshot(Date.now()),snapshotAt=0;
 for(let network=0;network<3;network++){
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array(6*(STEPS+1)*2*3),colors=new Float32Array(positions.length),indices=[];
  for(let category=0;category<6;category++){
   const color=new THREE.Color(FAMILY_COLORS[CATEGORY_ORDER[category]]),base=category*(STEPS+1)*2;
   for(let j=0;j<=STEPS;j++)for(let side=0;side<2;side++)color.toArray(colors,(base+j*2+side)*3);
   for(let j=0;j<STEPS;j++){const v=base+j*2;indices.push(v,v+1,v+2,v+1,v+3,v+2);}
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
  const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.026,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);meshes.push(mesh);
 }
 function bands(network){const total=snapshot.shown[network];return snapshot.counts[network].map(n=>total?n/total:0);}
 return {
  // The adapter repeats the combined per-network ledger rate on both endpoints.
  setSources(sources){for(let i=0;i<3;i++){const network=sources.filter(s=>s.chain===chains[i]);rates[i]=Math.max(0,...network.map(s=>s.fieldsPerSecond??0));expires[i]=Math.max(0,...network.map(s=>Date.parse(s.receivedAt)||0))+60000;}},
  setTokens(keys){traffic.setKeys(keys);snapshot=traffic.snapshot(Date.now());},
  ingest(rows){traffic.ingest(rows,Date.now());},
  source(datum,seed,compact){const network=Math.max(0,chains.indexOf(datum.chain));return ports[network].clone().add(new THREE.Vector3(...sourceOffset(seed,widths[network],compact)));},
  update(dt,compact){
   flowTime+=dt;
   if(Date.now()-snapshotAt>=200){snapshot=traffic.snapshot(Date.now());snapshotAt=Date.now();}
   for(let i=0;i<3;i++)if(Date.now()>expires[i])rates[i]=0;
   const total=rates.reduce((a,b)=>a+b,0);
   for(let i=0;i<3;i++){
    widths[i]+=(total?1.65*rates[i]/total*snapshot.fractions[i]-widths[i]:-widths[i])*(1-Math.exp(-dt*4));
    const position=meshes[i].geometry.getAttribute('position'),shares=bands(i);let consumed=0;
    for(let j=0;j<6;j++){
     const start=ports[i].toArray(),end=regions[zones[j]].toArray();
     start[compact?1:0]+=compact?-.38:.38;
     for(let step=0;step<=STEPS;step++){
      const t=step/STEPS,axis=compact?0:1,center=catmull(start,start,end,[end[0]+.7,end[1],end[2]],t);
      const width=shares[j]>0?widths[i]*shares[j]*(1-t)+.008*snapshot.fractions[i]*t:0;
      const envelope=Math.sin(Math.PI*t)**2,phase=i*1.7+j*.65;
      center[axis]+=Math.sin(t*Math.PI*2+phase+flowTime*.22)*.36*envelope;
      center[2]+=Math.cos(t*Math.PI*2+phase+flowTime*.17)*.28*envelope;
      center[axis]+=(consumed+shares[j]/2-.5)*widths[i]*(1-t);center[2]-=.04;
      for(let side=0;side<2;side++){const p=center.slice();p[axis]+=(side-.5)*width;position.setXYZ(j*(STEPS+1)*2+step*2+side,...p);}
     }consumed+=shares[j];
    }
    position.needsUpdate=true;meshes[i].visible=total>0&&snapshot.shown[i]>0;
   }
  },
  shares(){const sum=rates.reduce((a,b)=>a+b,0);return Object.fromEntries(chains.map((c,i)=>[c,sum?rates[i]*snapshot.fractions[i]/sum:0]));},
  dispose(){for(const mesh of meshes){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}}
 };
}
