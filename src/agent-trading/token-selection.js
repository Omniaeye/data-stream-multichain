export const CHAINS = [
 {id:'robinhood',label:'Robinhood Chain'},
 {id:'bsc',label:'BSC'},
 {id:'solana',label:'Solana'}
];
export function canonicalChain(chain){
 const value=String(chain).trim().toLowerCase();
 return ({robinhood:'robinhood','robinhood chain':'robinhood',bsc:'bsc',sol:'solana',solana:'solana'})[value]??null;
}
export function tokenKey(token){
 const chain=canonicalChain(token.chain);
 return `${chain??'unsupported'}:${chain==='solana'?token.id:token.id.toLowerCase()}`;
}
export function numericField(token,key){
 const value=token.fields.find(field=>field.key===key)?.value;
 return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
}
export function selectTokens(tokens,{chain='all',minMarketCap=0,minLiquidity=0}={}){
 if(!['all',...CHAINS.map(c=>c.id)].includes(chain))throw new Error('Unsupported chain selection');
 if(![minMarketCap,minLiquidity].every(v=>Number.isFinite(v)&&v>=0))throw new Error('Invalid filter threshold');
 const counts=Object.fromEntries(CHAINS.map(c=>[c.id,0]));
 const supported=tokens.filter(t=>canonicalChain(t.chain));
 for(const t of supported)counts[canonicalChain(t.chain)]++;
 const networkTokens=supported.filter(t=>chain==='all'||canonicalChain(t.chain)===chain);
 const matches=networkTokens.filter(t=>{
  const cap=numericField(t,'market_cap'),liquidity=numericField(t,'liquidity');
  return (minMarketCap===0||(cap!==null&&cap>=minMarketCap))&&(minLiquidity===0||(liquidity!==null&&liquidity>=minLiquidity));
 }).sort((a,b)=>(numericField(b,'market_cap')??-1)-(numericField(a,'market_cap')??-1)||tokenKey(a).localeCompare(tokenKey(b)));
 return {tokens:matches,counts,networkCount:networkTokens.length,excludedCount:networkTokens.length-matches.length,
  unknownMarketCap:networkTokens.filter(t=>numericField(t,'market_cap')===null).length,
  unknownLiquidity:networkTokens.filter(t=>numericField(t,'liquidity')===null).length};
}
