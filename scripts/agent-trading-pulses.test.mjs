import test from 'node:test';
import assert from 'node:assert/strict';
import {tradingPulseCycle,TRADING_PULSE_CYCLE_SECONDS,TRADING_PULSES_PER_CYCLE} from '../src/agent-trading/trading-pulses.js';

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
 assert.ok(tradingPulseCycle(0).every(p=>['robinhood','bsc','solana'].includes(p.chain)&&p.life>=2.35&&p.at+p.life<30));
});
