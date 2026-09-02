export const TRADING_PULSE_CYCLE_SECONDS=30;
export const TRADING_PULSES_PER_CYCLE=7;

const OPTIONS=[
 ['SKIP',12],['HOLD',4],['BUY',3],['HOLD MOONBAG',2],['PROFIT',2],
 ['TP1',2],['SL',2],['TP2',1],['TP3',1],['TP4',.45],['TP5',.25]
];

function random(seed){
 let value=(seed>>>0)||1;
 return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}

function weighted(next,exclude){
 const choices=OPTIONS.filter(([label])=>!exclude.has(label));
 const total=choices.reduce((sum,[,weight])=>sum+weight,0),at=next()*total;
 let cursor=0;
 for(const [label,weight] of choices){cursor+=weight;if(at<=cursor)return label;}
 return choices.at(-1)[0];
}

// Seven visual pulses are spread across each full thirty-second cycle.
// SKIP is deliberately common, but never fills an entire cycle.
export function tradingPulseCycle(cycle){
 const next=random(Math.imul((cycle|0)+1,0x9e3779b1)),labels=['SKIP','SKIP','SKIP'],used=new Set(labels);
 while(labels.length<TRADING_PULSES_PER_CYCLE){
  const cap=labels.filter(label=>label==='SKIP').length>=4;
  const label=cap?weighted(next,new Set(['SKIP',...used])):weighted(next,used);
  labels.push(label);used.add(label);
 }
 return labels.map((label,index)=>({
  label,index,
  // Each item occupies its own randomized slice. This keeps the brain in
  // motion across the whole cycle instead of emitting a visible packet.
  at:(index+.20+next()*.60)*(TRADING_PULSE_CYCLE_SECONDS/TRADING_PULSES_PER_CYCLE),
  life:1.45+next()*.45,
  // Positions live in the brain's local volume, never in a horizontal row.
  position:[(next()-.5)*1.56,(next()-.5)*1.02,.72+next()*.25],
  seed:next()
 }));
}

export function activeTradingPulses(time){
 const cycle=Math.floor(Math.max(0,time)/TRADING_PULSE_CYCLE_SECONDS),within=time-cycle*TRADING_PULSE_CYCLE_SECONDS;
 return tradingPulseCycle(cycle).filter(pulse=>within>=pulse.at&&within<pulse.at+pulse.life).map(pulse=>({...pulse,age:within-pulse.at,cycle}));
}
