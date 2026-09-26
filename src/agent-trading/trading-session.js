/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */
import {tradingPulseCycle} from './trading-pulses.js';

export const MAX_OPEN_POSITIONS=10;
export const TRADING_ROW_LIMIT=100;
export const TP_MULTIPLES=Object.freeze({TP1:2,TP2:3,TP3:4,TP4:5,TP5:6});

function random(seed){let n=seed>>>0;const next=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};next.state=()=>n;return next;}
function trajectory(next){
 // Presentation-only paths. A position owns its complete path at entry;
 // neither the real token feed nor observed market results enter this clock.
 const n=next()*130;
 let target=n<52?2:n<77?3:n<82?4:n<84?5:n<85?6:n<125?[1.5,1.6,1.7][Math.floor(next()*3)]:Math.round((.75+next()*.54)*100)/100;
 const steps=[{action:'HOLD',multiple:target<1?1.04:1.15}];
 if(target<2){
  steps.push({action:'HOLD',multiple:target<1?.98:Math.round((1+(target-1)*.65)*100)/100});
  steps.push({action:target<1?'SL':'PROFIT',multiple:target,closed:true});
 }else{
  steps.push({action:'HOLD',multiple:[1.5,1.6,1.7][Math.floor(next()*3)]});
  for(let multiple=2;multiple<=target;multiple++){
   steps.push({action:`TP${multiple-1}`,multiple,closed:multiple===target});
   if(multiple<target&&next()<.4)steps.push({action:'HOLD MOONBAG',multiple:multiple+.25});
  }
 }
 return steps;
}

export function mergeTradingRow(rows,event){
 const current=rows.find(row=>row.positionId===event.positionId);
 if(current&&(current.id===event.id||current.at>event.at))return rows;
 const next=[event,...rows.filter(row=>row.positionId!==event.positionId)];
 // Keep open cases available even if a long run of skipped cases arrives.
 const retained=new Set(next.filter(row=>row.status==='open').map(row=>row.positionId));
 for(const row of next){if(retained.size>=TRADING_ROW_LIMIT)break;retained.add(row.positionId);}
 return next.filter(row=>retained.has(row.positionId)).slice(0,TRADING_ROW_LIMIT);
}

export function createTradingSession({seed=41827,startedAt=Date.now(),snapshot}={}){
 if(snapshot&&(snapshot.version!==1||!Array.isArray(snapshot.open)||!Number.isSafeInteger(snapshot.serial)||!Number.isFinite(snapshot.lastTime)))throw new Error('Invalid trading session; preserve stored state');
 seed=snapshot?.seed??seed;startedAt=snapshot?.startedAt??startedAt;
 const next=random(snapshot?.randomState??seed),open=new Map(snapshot?.open??[]);
 let serial=snapshot?.serial??0,cycle=snapshot?.cycle??0,index=snapshot?.index??0,lastTime=snapshot?.lastTime??-1,externalOpen=0,schedule=tradingPulseCycle(cycle);
 function decision(slot,time,now){
  let position,action,multiple=null,status='skipped';
  if(slot.label==='SKIP'){
   position={id:`confidential:${seed}:${++serial}`,chain:slot.chain,reference:String(serial).padStart(6,'0')};action='SKIP';
  }else if(open.size+externalOpen<MAX_OPEN_POSITIONS&&(!open.size||open.size<3||next()<.36)){
   position={id:`confidential:${seed}:${++serial}`,chain:slot.chain,reference:String(serial).padStart(6,'0'),steps:trajectory(next),step:0,last:time};
   open.set(position.id,position);action='BUY';multiple=1;status='open';
  }else if(open.size){
   position=[...open.values()].sort((a,b)=>a.last-b.last)[0];
   const step=position.steps[position.step++];position.last=time;
   action=step.action;multiple=step.multiple;status=step.closed?'closed':'open';
   if(step.closed)open.delete(position.id);
  }else{
   position={id:`confidential:${seed}:${++serial}`,chain:slot.chain,reference:String(serial).padStart(6,'0')};action='SKIP';
  }
  return {id:`preview:${seed}:${cycle}:${index}`,positionId:position.id,reference:position.reference,
   kind:'presentation',subject:'CONFIDENTIAL',chain:position.chain,action,multiple,status,
   openCount:open.size,at:now,elapsed:time,position:slot.position,life:slot.life};
 }
 return {
  advance(time,now=startedAt+time*1000){
   if(!Number.isFinite(time)||time<0||time<lastTime)return [];
   const result=[];
   while(cycle*30+schedule[index].at<=time){
    const at=cycle*30+schedule[index].at;
    result.push(decision(schedule[index],at,now-(time-at)*1000));
    index++;
    if(index===schedule.length){index=0;cycle++;schedule=tradingPulseCycle(cycle);}
   }
   lastTime=time;return result;
  },
  setExternalOpen(count){externalOpen=Math.max(0,Math.min(MAX_OPEN_POSITIONS,count));},
  snapshot(){return structuredClone({version:1,seed,startedAt,randomState:next.state(),serial,cycle,index,lastTime,open:[...open]});},
  get time(){return Math.max(0,lastTime);},
  get openCount(){return open.size;}
 };
}
