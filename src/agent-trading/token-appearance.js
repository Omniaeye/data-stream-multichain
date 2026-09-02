import {canonicalChain,numericField} from './token-selection.js';
export const NETWORK_COLORS={robinhood:'#96e86d',bsc:'#e8c66b',solana:'#aa9dff'};
export function capLabelColor(cap){return cap==null||cap<=25000?'#edf5f0':cap<=50000?'#ffad61':cap<=150000?'#f4d85f':'#8de69c';}
export function globalTokenDiameter(token){const cap=numericField(token,'market_cap');return cap===null?12:Math.max(14,Math.min(192,16*(Math.max(1,cap)/5000)**.36));}
// Absolute log scale for the base size. The field applies one shared density scale.
// Cap affects the visible nucleus only, never the decorative attractor force.
export function tokenAppearance(token){
 const cap=numericField(token,'market_cap');
 const fraction=cap===null?0:Math.max(0,Math.min(1,(Math.log10(Math.max(1,cap))-4)/5))**.75;
 return {diameter:cap===null?18:20+fraction*64,radius:cap===null?.05:.07+fraction*.34,knownCap:cap!==null,color:NETWORK_COLORS[canonicalChain(token.chain)]??'#92a6a0'};
}
