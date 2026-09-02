import {PARAMETERS} from './parameter-catalog.js';
const counters=new Set(['buys','sells','swaps','buys_24h','sells_24h','volume','volume_24h']);
const gauges=new Set(['price','market_cap','liquidity','initial_liquidity','history_highest_market_cap','total_supply','holder_count','dev_token_burn_amount']);
const indicators=new Set(['rug_ratio','entrapment_ratio','hot_level','bluechip_owner_percentage','rat_trader_amount_rate','smart_degen_count','renowned_count','is_og','is_token_live']);
const zones={Market:'market',Holders:'distribution',Risk:'risk',Lifecycle:'identity',Social:'social'};
export const ORGANISM_PARAMETERS=PARAMETERS.map(p=>{
 let kind='metadata',visual='inspector';
 if(counters.has(p.key)){kind='window_aggregate';visual='aggregate_pulse';}
 else if(p.unit==='%'){kind='reported_change';visual='direction_marker';}
 else if(p.unit==='UTC'){kind='source_timestamp';visual='timeline_marker';}
 else if(indicators.has(p.key)){kind='source_indicator';visual='labelled_marker';}
 else if(p.unit==='Source flag'){kind='source_flag';visual='state_marker';}
 else if(p.unit==='Raw scale'){kind='unresolved_scale';visual='raw_value_only';}
 else if(gauges.has(p.key)||p.unit==='Count'){kind='snapshot_gauge';visual='value_marker';}
 return {key:p.key,label:p.label,zone:zones[p.group],kind,visual,unit:p.unit,scaleVerified:false,individualEvents:false,
  semantics:kind==='window_aggregate'?'Compare snapshots; a positive difference is not a count of new trades.':kind==='source_indicator'?'Provider-defined meaning requires verification; not a probability or an independent score.':p.note};
});
