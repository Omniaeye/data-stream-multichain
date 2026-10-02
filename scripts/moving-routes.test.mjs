import test from 'node:test';
import assert from 'node:assert/strict';
import {InstancedInterleavedBuffer,InterleavedBufferAttribute,Vector3} from 'three/webgpu';
import {retargetObservationRoutes} from '../src/agent-trading/observation-clouds.js';

test('moving tokens move existing GPU destinations without replaying fields or changing birth, route and category',()=>{
 const records=['moving','stationary','moving'].map((key,i)=>({birth:i,datum:{id:'field-'+i,tokenKey:key}}));
 const array=Float32Array.from({length:3*4*16},(_,i)=>i+.25),before=array.slice();
 const buffer=new InstancedInterleavedBuffer(array,16),targets=new InterleavedBufferAttribute(buffer,4,12);
 let resolved=0;
 assert.equal(retargetObservationRoutes(records,new Set(['moving']),()=>{resolved++;return[null,null,null,new Vector3(9,8,7)];},targets,buffer),true);
 assert.equal(resolved,1);
 for(let record=0;record<3;record++)for(let particle=0;particle<4;particle++)for(let field=0;field<16;field++){
  const index=(record*4+particle)*16+field;
  assert.equal(array[index],record!==1&&field>=12&&field<=14?[9,8,7][field-12]:before[index]);
 }
 assert.deepEqual(records.map(r=>r.birth),[0,1,2]);assert.equal(buffer.updateRanges.length,2);
 buffer.clearUpdateRanges();assert.equal(retargetObservationRoutes(records,new Set(),()=>assert.fail('no stationary resolution'),targets,buffer),false);assert.equal(buffer.updateRanges.length,0);
});
