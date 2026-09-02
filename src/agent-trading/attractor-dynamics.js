// Artistic, bounded mapping of source aggregates. Not a trading signal.
export function tokenDynamics(token,now=Date.now()){
 const received=Date.parse(token?.evidence?.receivedAt??'');
 const interval=token?.observationMetadata?.request_params?.query?.interval;
 const fresh=Number.isFinite(received)&&now>=received&&now-received<=120000;
 const value=key=>{const v=token?.fields.find(f=>f.key===key)?.value;return typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;};
 const volume=value('volume'),buys=value('buys'),sells=value('sells');
 const eligible=fresh&&interval==='5m';
 const volumeKnown=eligible&&volume!==null;
 const balanceKnown=eligible&&buys!==null&&sells!==null&&Number.isSafeInteger(buys)&&Number.isSafeInteger(sells)&&buys+sells>0&&Number.isSafeInteger(buys+sells);
 const balance=balanceKnown?(buys-sells)/(buys+sells):null;
 return {fresh,interval:interval??null,volumeKnown,balanceKnown,balance,
  attraction:volumeKnown ? .8+.4*Math.min(1,Math.log10(1+volume)/6):1,
  spin:balanceKnown?1+.12*balance:1,
  reason:!fresh?'stale':interval!=='5m'?'unsupported_window':'current'};
}
