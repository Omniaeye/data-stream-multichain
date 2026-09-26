/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */
import {Vector3} from 'three/webgpu';
import {createTradingSession} from './trading-session.js';
const colors={robinhood:'#b4ef89',bsc:'#efcf79',solana:'#bca8ff'};

export function createTradingRelay(host,{session=createTradingSession(),onEvent=()=>{}}={}){
 const label=document.createElement('span'),orb=document.createElement('span');
 label.className='brain-label brain-trading-pulse';orb.className='jev-trading-orb';
 label.setAttribute('aria-hidden','true');orb.setAttribute('aria-hidden','true');
 label.hidden=true;orb.hidden=true;host.append(label,orb);
 const point=new Vector3(),queue=[];let clock=session.time,active=null,target=[0,0];
 return {
  target(value){target=value;},
  notify(event){
   if(event.kind!=='observed')return;
   const prior=queue.findIndex(item=>item.positionId===event.positionId&&item.kind==='observed');
   if(prior>=0)queue[prior]=event;else queue.push(event);
  },
  update(dt,camera,width,height,origin,scale,paused,reducedMotion){
   if(!paused)clock+=dt;
   if(paused)return;
   const received=session.advance(clock,Date.now());
   // The journal is authoritative even when animation has fallen behind.
   if(received.length>7){received.forEach(onEvent);queue.length=0;active=null;}
   else queue.push(...received);
   if(active&&clock-active.born>=active.event.life){
    if(!active.delivered)onEvent(active.event);active=null;
   }
   if(!active&&queue.length){
    active={event:queue.shift(),born:clock,delivered:false};
    label.textContent=active.event.action;
    label.dataset.action=active.event.action.toLowerCase().replaceAll(' ','-');
    label.dataset.eventId=active.event.id;label.dataset.kind=active.event.kind;
    orb.style.setProperty('--relay-color',colors[active.event.chain]??colors.robinhood);
   }
   host.dataset.tradingPulseCycle=String(Math.floor(clock/30));
   if(!active){label.hidden=true;orb.hidden=true;return;}
   const age=clock-active.born,event=active.event;
   point.set(...event.position).multiplyScalar(scale).add(origin).project(camera);
   const start=[(point.x+1)*width/2,(1-point.y)*height/2];
   label.hidden=age>1.85;
   label.style.left=start[0]+'px';label.style.top=start[1]+'px';
   label.style.opacity=String(reducedMotion?1:Math.min(1,age/.15,Math.max(0,(1.85-age)/.25)));
   const t=Math.max(0,Math.min(1,(age-1.55)/.8)),u=1-t;
   orb.hidden=reducedMotion||t<=0||t>=1;
   if(!orb.hidden){
    const x=u*u*u*start[0]+3*u*u*t*(start[0]+36)+3*u*t*t*(target[0]+50)+t*t*t*target[0];
    const y=u*u*u*start[1]+3*u*u*t*(start[1]+30)+3*u*t*t*(target[1]-30)+t*t*t*target[1];
    orb.style.transform=`translate(${x}px,${y}px)`;
   }
   if(age>=2.35&&!active.delivered){active.delivered=true;onEvent(event);}
  },
  dispose(){label.remove();orb.remove();queue.length=0;}
 };
}
