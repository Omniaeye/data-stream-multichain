import {Fn,If,vec3} from 'three/tsl';

// Shared by the visible material and the GPU route regression probe.
export function journeyNode(path,progress,seed,time){
 return Fn(()=>{
  const [a,b,c,d]=path.map((anchor,index)=>anchor.toVar(`journeyAnchor${index}`));
  const p=progress.clamp(0,1).toVar('journeyProgress');
  const segment=p.lessThan(.36).select(0,p.lessThan(.53).select(1,2)).toVar('journeySegment');
  // Materialize before branching: a branch-local temporary must never leak
  // into a sibling branch, leaving outbound particles at the brain relay.
  const t=segment.equal(0).select(p.div(.36),segment.equal(1).select(p.sub(.36).div(.17),p.sub(.53).div(.47))).clamp(0,1).toVar('journeyT');
  const t2=t.mul(t).toVar(),t3=t2.mul(t).toVar(),point=vec3(0).toVar();
  const curve=(v0,v1,v2,v3)=>v1.mul(2).add(v2.sub(v0).mul(t)).add(v0.mul(2).sub(v1.mul(5)).add(v2.mul(4)).sub(v3).mul(t2)).add(v0.negate().add(v1.mul(3)).sub(v2.mul(3)).add(v3).mul(t3)).mul(.5);
  If(segment.equal(0),()=>{point.assign(curve(a,a,b,c));}).ElseIf(segment.equal(1),()=>{point.assign(curve(a,b,c,d));}).Else(()=>{point.assign(curve(b,c,d,d));});
  const envelope=t.mul(Math.PI).sin().pow(2).mul(segment.equal(0).select(.28,segment.equal(1).select(.06,.12)));
  const phase=seed.mul(Math.PI*2),wave=t.mul(Math.PI*2).add(phase);
  const bend=vec3(wave.add(time.mul(.24)).sin().mul(.24),wave.add(time.mul(.32)).sin(),wave.add(time.mul(.27)).cos()).mul(envelope);
  return point.add(bend);
 })();
}
