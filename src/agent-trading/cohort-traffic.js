import {familyFor} from './field-families.js';
import {CATEGORY_ORDER} from './flow-path.js';
const CHAINS=['robinhood','bsc','solana'];
// Fifteen one-second buckets: bounded by recent tokens, not session history.
export function createCohortTraffic(windowSeconds=15){
 const buckets=new Map();let keys=new Set();
 return {
  setKeys(next){keys=new Set(next);},
  ingest(rows,now){
   const second=Math.floor(now/1000);let bucket=buckets.get(second);
   if(!bucket){bucket=new Map();buckets.set(second,bucket);}
   for(const row of rows){
    const chain=CHAINS.indexOf(row.chain),category=CATEGORY_ORDER.indexOf(familyFor(row.field.key).category);
    if(chain<0||category<0)continue;
    let item=bucket.get(row.tokenKey);
    if(!item){item={chain,counts:Array(6).fill(0)};bucket.set(row.tokenKey,item);}
    item.counts[category]++;
   }
   for(const key of buckets.keys())if(key<=second-windowSeconds)buckets.delete(key);
  },
  snapshot(now){
   const counts=CHAINS.map(()=>Array(6).fill(0)),all=[0,0,0];
   for(const [second,bucket] of buckets){
    if(second<=Math.floor(now/1000)-windowSeconds){buckets.delete(second);continue;}
    for(const [key,item] of bucket){all[item.chain]+=item.counts.reduce((a,b)=>a+b,0);if(keys.has(key))item.counts.forEach((n,i)=>counts[item.chain][i]+=n);}
   }
   const shown=counts.map(row=>row.reduce((a,b)=>a+b,0));
   return {counts,shown,all,fractions:shown.map((n,i)=>all[i]?n/all[i]:0)};
  }
 };
}
