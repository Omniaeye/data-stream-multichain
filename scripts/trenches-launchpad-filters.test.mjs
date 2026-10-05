import test from 'node:test';
import assert from 'node:assert/strict';
import {launchpadOptions,launchpadKey,matchesLaunchpad,toggleLaunchpad,networkLaunchpads,matchesNetworkLaunchpad,launchpadBlockKey} from '../src/agent-trading/trenches-launchpad.js';
import {readPreferences,tokenMatches,tokenBlocked} from '../src/agent-trading/trenches-policy.js';
import {readTools} from '../src/agent-trading/trenches-tools.js';
const now=Date.now();
const token=(chain,venue)=>({id:chain+venue,chain,name:'SAME',firstSeenAt:new Date(now-1000).toISOString(),fields:venue?[{key:'launchpad_platform',value:venue}]:[]});
test('catalog includes every supported platform, distinct reported unknowns and unspecified origins',()=>{
 const catalog=launchpadOptions([token('sol','future_A'),token('bsc','future_B'),token('sol','FUTURE_A')]);
 assert.equal(catalog.length,23);
 for(const id of ['pump','stonkfun','pons','fourmeme','flap','meteora','reported:future_a','reported:future_b','unreported'])assert.ok(catalog.some(p=>p.id===id));
 assert.equal(launchpadKey(token('sol','pump.fun')),'pump');
 assert.equal(launchpadKey({...token('robinhood',null),fields:[{key:'exchange',value:'pons'}]}),'unreported');
});
test('All includes future venues; removing one preserves others; selecting none is explicit',()=>{
 const options=launchpadOptions(),selected=toggleLaunchpad(null,'meteora',options);
 assert.ok(!matchesLaunchpad(token('sol','meteora_dbc'),selected));
 assert.ok(matchesLaunchpad(token('sol','pump'),selected));
 assert.ok(matchesLaunchpad(token('bsc','fourmeme'),selected));
 assert.ok(matchesLaunchpad(token('robinhood','pons_v2'),selected));
 assert.ok(matchesLaunchpad(token('sol','new_platform'),null));
 assert.ok(!matchesLaunchpad(token('sol','pump'),[]));
 assert.equal(toggleLaunchpad(selected,'meteora',options),null);
 assert.deepEqual(toggleLaunchpad([],'pump',options),['pump']);
});
test('launchpad selection intersects network filters and accepts multiple platforms without ticker inference',()=>{
 const p={...readPreferences(null),mode:'new',chains:['solana'],launchpads:['pump','meteora']};
 assert.ok(tokenMatches(token('sol','pump'),p,[],now));
 assert.ok(tokenMatches(token('sol','meteora'),p,[],now));
 assert.ok(!tokenMatches(token('bsc','pump'),p,[],now));
 assert.ok(!tokenMatches(token('sol','bags'),p,[],now));
 assert.ok(!tokenMatches(token('sol',null),p,[],now));
 assert.ok(tokenMatches(token('bsc','flap'),{...p,chains:['bsc'],launchpads:['flap']},[],now));
 assert.ok(tokenMatches(token('robinhood','pons_v2'),{...p,chains:['robinhood'],launchpads:['pons']},[],now));
});
test('preferences and saved views preserve all, none, selected aliases and independent blacklist rules',()=>{
 assert.equal(readPreferences('{}').launchpads,null);
 assert.deepEqual(readPreferences({launchpads:[]}).launchpads,[]);
 const prefs=readPreferences({launchpads:['pump','pump',false,'bogus','reported:future_a'],blocks:[{key:'x:owner',label:'owner'}]});
 assert.deepEqual(prefs.launchpads,['pump','reported:future_a']);
 const view=readTools({views:[{id:'v',name:'Pump only',prefs}]}).views[0];
 assert.deepEqual(view.prefs.launchpads,prefs.launchpads);assert.deepEqual(view.prefs.blocks,[]);assert.equal(prefs.blocks.length,1);
});
test('network catalogs retain known empty venues and add only explicitly observed cross-chain origins',()=>{
 const options=launchpadOptions([token('bsc','future_A'),token('robinhood','future_B'),token('sol','flap')]);
 const ids=chain=>options.filter(o=>o.chains.includes(chain)).map(o=>o.id);
 assert.ok(ids('solana').includes('pump'));assert.ok(ids('solana').includes('meteora'));assert.ok(!ids('solana').includes('pons'));
 assert.ok(ids('bsc').includes('fourmeme'));assert.ok(ids('robinhood').includes('pons'));
 assert.ok(ids('solana').includes('flap'));assert.ok(ids('bsc').includes('flap'));assert.ok(ids('robinhood').includes('flap'));
 assert.ok(ids('bsc').includes('reported:future_a'));assert.ok(!ids('solana').includes('reported:future_a'));
 assert.ok(ids('robinhood').includes('reported:future_b'));assert.ok(!ids('bsc').includes('reported:future_b'));
 for(const chain of ['solana','bsc','robinhood'])assert.ok(ids(chain).includes('unreported'));
});
test('per-network selections preserve legacy preferences, independent shared venues, none and saved views',()=>{
 const legacy=readPreferences({launchpads:['pump','flap']});
 assert.deepEqual(networkLaunchpads(legacy,'bsc'),['pump','flap']);
 const p=readPreferences({...legacy,mode:'new',launchpadsByChain:{solana:['pump'],bsc:[],robinhood:null,invalid:['flap']}});
 assert.ok(matchesNetworkLaunchpad(token('sol','pump'),p));assert.ok(!matchesNetworkLaunchpad(token('sol','flap'),p));
 assert.ok(!matchesNetworkLaunchpad(token('bsc','flap'),p));assert.ok(matchesNetworkLaunchpad(token('robinhood','flap'),p));
 assert.ok(matchesNetworkLaunchpad(token('robinhood','new_future'),p));
 assert.ok(tokenMatches(token('robinhood','pons'),p,[],now));assert.ok(!tokenMatches(token('bsc','flap'),p,[],now));
 assert.deepEqual(p.launchpadsByChain,{solana:['pump'],bsc:[],robinhood:null});
 assert.deepEqual(readPreferences(JSON.stringify(p)).launchpadsByChain,p.launchpadsByChain);
 const view=readTools({views:[{id:'n',name:'Network view',prefs:p}]}).views[0];
 assert.deepEqual(view.prefs.launchpadsByChain,p.launchpadsByChain);
});
test('launchpad blacklist matches explicit venue and chain, persists, and does not guess unknown origins',()=>{
 const bsc=token('bsc','flap'),hood=token('robinhood','flap'),key=launchpadBlockKey(bsc);
 assert.equal(key,'launchpad:bsc:flap');assert.equal(launchpadBlockKey(token('sol',null)),null);
 assert.equal(launchpadBlockKey(token('bsc','future_A')),'launchpad:bsc:reported:future_a');
 const blocks=[{key,label:'Flap · BSC',scope:'tokens'}];
 assert.ok(tokenBlocked(bsc,[],blocks));assert.ok(!tokenBlocked(hood,[],blocks));assert.ok(!tokenBlocked(token('bsc','fourmeme'),[],blocks));
 assert.ok(!tokenBlocked({...token('bsc',null),name:'flap'},[],blocks));
 const restored=readPreferences({mode:'new',blocks:[...blocks,{key:'launchpad:bogus:flap',label:'bad'},{key:'launchpad:bsc:unreported',label:'bad'}]});
 assert.deepEqual(restored.blocks,blocks);assert.ok(!tokenMatches(bsc,restored,[],now));assert.ok(tokenMatches(hood,restored,[],now));
 assert.ok(tokenMatches(bsc,{...restored,blocks:[]},[],now));
});
