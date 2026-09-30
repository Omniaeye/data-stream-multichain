import test from 'node:test';import assert from 'node:assert/strict';
import {tokenLaunchpad} from '../src/agent-trading/trenches-launchpad.js';
const token=fields=>({id:'not-proof-pump',chain:'robinhood',name:'Pump Pons Stonks',fields:Object.entries(fields).map(([key,value])=>({key,value}))});
test('launch venue aliases include Pump, StonkFun, Pons versions, Flap and Four.meme',()=>{
 for(const [value,id] of [['Pump.fun','pump'],['pump','pump'],['pump_mayhem','pump'],['stonkfun','stonkfun'],['pons','pons'],['pons_v2','pons'],['flap_stocks','flap'],['fourmeme','fourmeme'],['longxyz','long']])assert.equal(tokenLaunchpad(token({launchpad:value})).id,id);
});
test('specific platform takes precedence over generic bonding-curve infrastructure',()=>{
 assert.equal(tokenLaunchpad(token({launchpad:'ray_launchpad',launchpad_platform:'stonkfun'})).id,'stonkfun');
 assert.equal(tokenLaunchpad(token({launchpad:'meteora_virtual_curve',launchpad_platform:'bags'})).id,'bags');
 assert.equal(tokenLaunchpad(token({launchpad:'pons_v2',launchpad_platform:'pool_uniswap_v3'})).id,'pons');
});
test('migration, exchange, chain, ticker and suffix never imply a launchpad',()=>{
 for(const fields of [{},{exchange:'pump_amm'},{migrated_pool_exchange:'pons'},{launchpad_platform:'pool_pancake'},{launchpad:false},{launchpad:'0x12345'},{launchpad:'unknown'}])assert.equal(tokenLaunchpad(token(fields)),null);
});
test('unknown launch venues retain their supplied identity without borrowing another logo',()=>{
 const p=tokenLaunchpad(token({launchpad:'future_launch'}));assert.equal(p.id,'other');assert.equal(p.label,'future_launch');assert.equal(p.field,'launchpad');
 assert.notEqual(tokenLaunchpad(token({launchpad_platform:'stonkbroker_v2'})).id,'stonkfun');
});
