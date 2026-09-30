// Bounded animation telemetry. These are browser frame intervals, not GPU timings.
export function createFrameTiming(capacity=256){
 const values=[];let longFrames=0;
 return {
  sample(milliseconds){if(!Number.isFinite(milliseconds)||milliseconds<=0)return;if(milliseconds>50)longFrames++;values.push(milliseconds);if(values.length>capacity)values.shift();},
  stats(){const sorted=values.slice().sort((a,b)=>a-b),at=q=>sorted.length?+sorted[Math.ceil((sorted.length-1)*q)].toFixed(2):0;return {frames:sorted.length,p50:at(.5),p90:at(.9),p99:at(.99),max:at(1),longFrames};},
  reset(){values.length=0;longFrames=0;}
 };
}
