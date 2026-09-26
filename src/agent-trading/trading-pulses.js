/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */
export const TRADING_PULSE_CYCLE_SECONDS=30;
export const TRADING_PULSES_PER_CYCLE=7;

const CHAINS=['robinhood','bsc','solana'];

function random(seed){
 let value=(seed>>>0)||1;
 return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}

// Timing only. The position state machine owns BUY/HOLD/TP/close semantics.
export function tradingPulseCycle(cycle){
 const cycleIndex=Math.max(0,Math.floor(Number.isFinite(cycle)?cycle:0));
 const next=random(Math.imul(cycleIndex+1,0x9e3779b1));
 const labels=['SKIP','SKIP','SKIP','EVALUATE','EVALUATE','EVALUATE','EVALUATE'];
 for(let i=labels.length-1;i>0;i--){
  const j=Math.floor(next()*(i+1));[labels[i],labels[j]]=[labels[j],labels[i]];
 }
 // Random gaps partition the free time after reserving room for each relay.
 const gaps=Array.from({length:8},()=>.05+next()**2),total=gaps.reduce((a,b)=>a+b,0);
 const free=30-7*2.8;let at=0;
 return labels.map((label,index)=>{
 at+=gaps[index]/total*free;
 const slot={
  id:`preview:${cycleIndex}:${index}`,kind:'presentation',subject:'CONFIDENTIAL',
  label,index,cycle:cycleIndex,chain:CHAINS[Math.floor(next()*CHAINS.length)],
  // Each randomized slice leaves room for the complete card to finish, even
  // at the cycle boundary. No overlapping packets or disappearing last event.
  at,
  life:2.5+next()*.15,
  position:[(next()-.5)*1.20,(next()-.5)*.64,.82],seed:next()
 };at+=2.8;return slot;});
}
