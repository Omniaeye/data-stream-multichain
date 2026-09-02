// The screen retains a bounded recent window, not the source archive.
export const DATA_STREAM_LIMIT=10000;
export function appendDataStream(state,route){
 if(!route.rows.length&&!route.unverified)return state;
 const rows=[...route.rows].reverse().concat(state.rows).slice(0,DATA_STREAM_LIMIT);
 const byChain={...(state.byChain??{})};for(const row of route.rows)byChain[row.chain]=(byChain[row.chain]??0)+1;
 return {rows,total:state.total+route.rows.length,unverified:state.unverified+route.unverified,
  captures:state.captures+route.captures,latest:route.rows.at(-1)?.receivedAt??state.latest,byChain};
}
