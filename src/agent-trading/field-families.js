// These are display families, never arithmetic totals or merged identities.
const definitions=[
 ['valuation','Valuation','Market',['price','market_cap','history_highest_market_cap']],
 ['liquidity','Liquidity','Market',['liquidity','initial_liquidity']],
 ['supply','Supply','Market',['total_supply']],
 ['trade_flow','Trade flow','Market',['buys','sells','swaps','volume']],
 ['flow_24h','24h flow','Market',['buys_24h','sells_24h','volume_24h']],
 ['price_changes','Price changes','Market',['price_change_percent','price_change_percent1m','price_change_percent5m','price_change_percent1h']],
 ['gas','Gas','Market',['gas_fee']],['ranking','Ranking','Market',['rank']],
 ['holders','Holders','Holders',['holder_count']],
 ['holder_mix','Holder distribution','Holders',['top_10_holder_rate','creator_balance_rate','dev_team_hold_rate','rat_trader_amount_rate','bluechip_owner_percentage']],
 ['trader_counts','Trader counts','Holders',['sniper_count','smart_degen_count','renowned_count','bot_degen_count']],
 ['trader_mix','Trader distribution','Holders',['bundler_rate','top70_sniper_hold_rate','bot_degen_rate']],
 ['taxes','Buy / sell taxes','Risk',['buy_tax','sell_tax']],
 ['risk_flags','Risk flags','Risk',['is_honeypot','is_wash_trading']],
 ['permissions','Permissions','Risk',['renounced_mint','renounced_freeze_account','is_renounced','is_open_source']],
 ['burn','Burn activity','Risk',['burn_ratio','burn_status','dev_token_burn_amount','dev_token_burn_ratio']],
 ['risk_scores','Source risk scores','Risk',['rug_ratio','entrapment_ratio']],
 ['locks','Locks','Risk',['lock_percent']],
 ['launch','Launch','Lifecycle',['launchpad','launchpad_platform','launchpad_status','launch_quote_address']],
 ['lifecycle_times','Lifecycle times','Lifecycle',['created_timestamp','creation_timestamp','open_timestamp','complete_timestamp']],
 ['pool','Pool / exchange','Lifecycle',['pool_type','pool_type_str','exchange','migrated_pool_exchange']],
 ['creator','Creator','Lifecycle',['creator','creator_token_status','creator_close']],
 ['social_profiles','Social profiles','Social',['twitter_username','twitter','twitter_handle','website','telegram']],
 ['profile_changes','Profile history','Social',['twitter_change_flag','twitter_rename_count','twitter_del_post_token_count','twitter_create_token_count']],
 ['socials_dup','Social duplicates','Social',['website_dup','telegram_dup','twitter_dup']],
 ['attention','Attention','Social',['square_mentions','visiting_count','hot_level']],
 ['source_tags','Source tags','Social',['is_show_alert','is_og']],
 ['livestream','Live status','Social',['is_token_live','start_live_timestamp','end_live_timestamp']]
];
export const FAMILY_COLORS={Market:'#6bdcca',Holders:'#92b4ff',Risk:'#edc58e',Lifecycle:'#bb9ff2',Social:'#e9a9d3',Other:'#a4bcc0'};
export const FIELD_FAMILIES=definitions.map(([id,label,category,keys])=>({id,label,category,keys,color:FAMILY_COLORS[category]}));
const lookup=new Map(FIELD_FAMILIES.flatMap(f=>f.keys.map(key=>[key,f])));
export function familyFor(key){return lookup.get(key)??{id:key,label:key,category:'Other',keys:[key],color:FAMILY_COLORS.Other};}
export function groupDataPoints(rows){
 const grouped=new Map();
 for(const row of rows){
  const family=familyFor(row.field.key),window=row.window??'unknown';
  const id=`${row.captureId}:${row.tokenKey}:${window}:${family.id}`;
  let group=grouped.get(id);
  if(!group){group={id,family,tokenKey:row.tokenKey,tokenName:row.tokenName,chain:row.chain,receivedAt:row.receivedAt,captureId:row.captureId,window,rows:[]};grouped.set(id,group);}
  group.rows.push(row);
 }
 // Interleave tokens, instead of dumping every field of a token consecutively.
 const tokens=new Map();for(const g of grouped.values()){if(!tokens.has(g.tokenKey))tokens.set(g.tokenKey,[]);tokens.get(g.tokenKey).push(g);}
 const result=[],sets=[...tokens.values()];
 for(let offset=0;sets.some(set=>offset<set.length);offset++)for(let i=0;i<sets.length;i++){const set=sets[i];if(offset<set.length)result.push(set[(offset+i)%set.length]);}
 return result;
}
export function groupSummary(group){
 if(group.rows.length===1)return String(group.rows[0].field.value);
 if(group.family.id==='socials_dup')return group.rows.map(r=>`${r.field.key.split('_')[0]} ${r.field.value}`).join(' · ');
 return `${group.rows.length} fields`;
}
export function appendGroupedStream(state,groups){
 if(!groups.length)return state;
 const byChain={...state.byChain};let fields=0;
 for(const group of groups){fields+=group.rows.length;byChain[group.chain]=(byChain[group.chain]??0)+group.rows.length;}
 return {rows:groups.slice().reverse().concat(state.rows).slice(0,10000),total:state.total+fields,byChain,latest:groups.at(-1).presentedAt??groups.at(-1).receivedAt};
}
