import test from 'node:test';
import assert from 'node:assert/strict';
import {activeTradingPulses,tradingPulseCycle,TRADING_PULSE_CYCLE_SECONDS,TRADING_PULSES_PER_CYCLE} from '../src/agent-trading/trading-pulses.js';

test('trading visual pulses are deterministic, spaced seven-item cycles every thirty seconds',()=>{
 for(const cycle of [0,1,7,101]){
  const first=tradingPulseCycle(cycle),again=tradingPulseCycle(cycle);
  assert.deepEqual(first,again);assert.equal(first.length,TRADING_PULSES_PER_CYCLE);
  assert.ok(first.filter(pulse=>pulse.label==='SKIP').length>=2);
  assert.ok(first.filter(pulse=>pulse.label==='SKIP').length<=4);
  assert.equal(new Set(first.map(pulse=>pulse.index)).size,TRADING_PULSES_PER_CYCLE);
  assert.ok(first.every(pulse=>pulse.at>0&&pulse.at<TRADING_PULSE_CYCLE_SECONDS));
  assert.ok(first.every((pulse,index)=>index===0||pulse.at-first[index-1].at>2));
 }
 assert.equal(activeTradingPulses(TRADING_PULSE_CYCLE_SECONDS-1).length,0);
 assert.equal(activeTradingPulses(0).length,0);
 assert.ok(activeTradingPulses(tradingPulseCycle(0)[0].at+.1).length>=1);
});
