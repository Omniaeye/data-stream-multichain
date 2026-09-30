import {canonicalChain} from './token-selection.js';
// Source-reported launch venue only. A chain, address suffix or migrated DEX is not an origin.
const definitions=[
 ['pump','Pump.fun',['pump','pump.fun','pumpfun','pump_fun','pump_mayhem']],
 ['stonkfun','StonkFun',['stonkfun','stonkfun.xyz','stonk_fun']],
 ['pons','Pons',['pons','pons_v2']],
 ['flap','Flap',['flap','flap_pve','flap_stocks']],
 ['fourmeme','Four.meme',['fourmeme','four.meme','four_meme']],
 ['meteora','Meteora',['meteora','meteora_virtual_curve','meteora_dbc']],
 ['long','Long.xyz',['longxyz','long.xyz','long_xyz']],
 ['bags','Bags',['bags','bags.fm']],
 ['bankr','Bankr',['bankr']],
 ['letsbonk','LetsBONK',['letsbonk','letsbonk.fun']],
 ['raydium','Raydium LaunchLab',['ray_launchpad','launchlab']],
 ['noxa','Noxa',['noxa']],
 ['stonkbroker','StonkBroker',['stonkbroker','stonkbroker_v2']],
 ['poolstrade','Pools.trade',['pools_trade','pools_trade_instant','pools_trade_cca']],
 ['lunch','Lunch',['lunch','lunch_pair_v3']],
 ['openfour','OpenFour',['openfour']],
 ['klik','Klik',['klik']],
 ['circus','Circus',['circus']],
 ['pairfund','Pair Fund',['pair_fund']],
 ['geniusfun','GeniusFun',['geniusfun']],
];
const aliases=new Map(definitions.flatMap(([id,label,values])=>values.map(value=>[value,{id,label}])));
// Catalog grouping only, never used to assign a token's origin. See launchpad SOURCES.md.
const networks={solana:['pump','stonkfun','meteora','bags','letsbonk','raydium'],bsc:['flap','fourmeme','openfour','geniusfun'],robinhood:['pons','flap','long','bags','bankr','noxa','stonkbroker','poolstrade','lunch','klik','circus','pairfund']};
export const launchpadNetworks=Object.keys(networks);
export function tokenLaunchpad(token){
 for(const field of ['launchpad_platform','launchpad']){
  const raw=token.fields?.find(f=>f.key===field)?.value;
  if(typeof raw!=='string')continue;
  const value=raw.trim().toLowerCase();
  if(!value||/^(?:unknown|none|null|n\/a|false|true|0|1|-)$/.test(value)||value.startsWith('pool_')||/^0x[\da-f]+$/.test(value)||value.length>80)continue;
  const venue=aliases.get(value);
  return {...(venue??{id:'other',label:raw.trim()}),field,raw:raw.trim()};
 }
 return null;
}

// Identity is independent of network. Unknown source-reported venues remain
// separate options; an absent origin is not guessed from a chain or DEX.
export function launchpadKey(token){
 const venue=tokenLaunchpad(token);
 return !venue?'unreported':venue.id==='other'?'reported:'+venue.raw.normalize('NFKC').toLowerCase():venue.id;
}
export function launchpadOptions(tokens=[]){
 const options=new Map(definitions.map(([id,label])=>[id,{id,label,mark:id,chains:launchpadNetworks.filter(chain=>networks[chain].includes(id))}]));
 for(const token of tokens){const venue=tokenLaunchpad(token);if(!venue)continue;const id=launchpadKey(token),chain=canonicalChain(token.chain);if(!options.has(id))options.set(id,{id,label:venue.label,mark:'other',chains:[]});const option=options.get(id);if(chain&&launchpadNetworks.includes(chain)&&!option.chains.includes(chain))option.chains.push(chain);}
 options.set('unreported',{id:'unreported',label:'Unspecified',mark:'unreported',chains:[...launchpadNetworks]});
 return [...options.values()];
}
export function validLaunchpadKey(key){return typeof key==='string'&&(key==='unreported'||definitions.some(([id])=>id===key)||/^reported:[^\u0000-\u001f]{1,100}$/u.test(key));}
export function matchesLaunchpad(token,selected){return selected==null||selected.includes(launchpadKey(token));}
export function networkLaunchpads(prefs,chain){return Object.hasOwn(prefs.launchpadsByChain??{},chain)?prefs.launchpadsByChain[chain]:prefs.launchpads??null;}
export function matchesNetworkLaunchpad(token,prefs){return matchesLaunchpad(token,networkLaunchpads(prefs,canonicalChain(token.chain)));}
export function launchpadBlockKey(token){const chain=canonicalChain(token.chain);return tokenLaunchpad(token)&&launchpadNetworks.includes(chain)?'launchpad:'+chain+':'+launchpadKey(token):null;}
export function validLaunchpadBlockKey(key){if(typeof key!=='string')return false;const [,chain,...id]=key.split(':');return key.startsWith('launchpad:')&&launchpadNetworks.includes(chain)&&validLaunchpadKey(id.join(':'))&&id.join(':')!=='unreported';}
export function toggleLaunchpad(selected,id,options){
 const current=new Set(selected??options.map(option=>option.id));
 if(current.has(id))current.delete(id);else current.add(id);
 return options.every(option=>current.has(option.id))?null:[...current];
}
