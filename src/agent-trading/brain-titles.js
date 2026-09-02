import {familyFor} from './field-families.js';
import {observationSeed} from './observation-organisms.js';
export const BRAIN_TITLE_LIMIT=12;
export function createBrainTitles(){
 const slots=Array(BRAIN_TITLE_LIMIT).fill(null),seen=new Set();let nextAt=0,sequence=0;
 return {
  clear(){slots.fill(null);},
  restrict(keys){const visible=new Set(keys);slots.forEach((slot,i)=>{if(slot&&!visible.has(slot.datum.tokenKey))slots[i]=null;});return slots;},
  update(records,time,limit=BRAIN_TITLE_LIMIT,{charWidth=.074,lineHeight=.27}={}){
   slots.forEach((slot,i)=>{if(i>=limit||slot&&time-slot.born>=slot.life)slots[i]=null;});
   if(time<nextAt)return slots;
   nextAt=time+.08;
   const occupied=new Set(slots.filter(Boolean).map(s=>s.family.id));
   const candidates=records.filter(r=>!seen.has(r.datum.id)&&!occupied.has(familyFor(r.datum.field.key).id));
   // Stagger births. A word is a brief receipt, never a permanent regional label.
   const index=slots.findIndex((s,i)=>i<limit&&!s),record=candidates[Math.floor(observationSeed(String(sequence++))*candidates.length)];
   if(index<0||!record)return slots;
   const datum=record.datum,family=familyFor(datum.field.key),seed=observationSeed(datum.id);
   let point=null;
   for(let attempt=0;attempt<32;attempt++){
    const a=observationSeed(datum.id+':angle:'+attempt)*Math.PI*2,r=Math.sqrt(observationSeed(datum.id+':r:'+attempt));
    const candidate=[Math.cos(a)*r*.83,.1+Math.sin(a)*r*.63,.35+seed*.28];
    const innerWidth=1.32*Math.sqrt(Math.max(0,1-((candidate[1]-.1)/.84)**2));
    if(Math.abs(candidate[0])+family.label.length*charWidth/2>innerWidth)continue;
    // Loose exclusion zones keep words readable without aligning them into rows.
    if(slots.filter(Boolean).every(s=>Math.abs(s.position[1]-candidate[1])>lineHeight||Math.abs(s.position[0]-candidate[0])>(family.label.length+s.family.label.length)*charWidth/2+.13)){point=candidate;break;}
   }
   if(!point)return slots;
   seen.add(datum.id);if(seen.size>12000)seen.delete(seen.values().next().value);
   slots[index]={family,datum,born:time,life:.8+seed*.6,position:point,seed};
   nextAt=time+.07+seed*.035;
   return slots;
  }
 };
}
