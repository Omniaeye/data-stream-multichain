const pooled=['fields','observationMetadata','evidence','ranking'];
export function packLive(message){
 const pools=Object.fromEntries([...pooled,'tokens'].map(key=>[key,[]]));
 const maps=Object.fromEntries(Object.keys(pools).map(key=>[key,new Map()]));
 function intern(key,value){const signature=JSON.stringify(value),map=maps[key];if(map.has(signature))return map.get(signature);const index=pools[key].push(value)-1;map.set(signature,index);return index;}
 function token(value){const t={...value};for(const key of pooled)if(t[key]!=null)t[key]=intern(key,t[key]);return intern('tokens',t);}
 function capture(value){return {...value,...(value.tokens?{tokens:value.tokens.map(token)}:{}),...(value.batches?{batches:value.batches.map(capture)}:{})};}
 const body=message.kind==='snapshot'?{...message,capture:capture(message.capture)}:{...message,metadata:capture(message.metadata),upsert:message.upsert.map(token)};
 return {wire:'jev-packed-v1',pools,message:body};
}
export function unpackLive(value){
 if(value?.wire===undefined)return value;
 if(value.wire!=='jev-packed-v1'||!value.message||!['snapshot','delta'].includes(value.message.kind))throw Error('Invalid packed stream');
 const pools=value.pools;
 for(const key of [...pooled,'tokens'])if(!Array.isArray(pools?.[key])||pools[key].length>24000)throw Error('Invalid stream pool');
 const resolve=(key,index)=>{if(!Number.isSafeInteger(index)||index<0||index>=pools[key].length)throw Error('Invalid stream reference');return pools[key][index];};
 const decoded=new Map();
 function token(index){if(decoded.has(index))return decoded.get(index);const t={...resolve('tokens',index)};for(const key of pooled)if(t[key]!=null)t[key]=resolve(key,t[key]);decoded.set(index,t);return t;}
 function capture(c,depth=0){if(!c||depth>1||c.tokens&&(!Array.isArray(c.tokens)||c.tokens.length>1200)||c.batches&&(!Array.isArray(c.batches)||c.batches.length>18))throw Error('Invalid packed capture');return {...c,...(c.tokens?{tokens:c.tokens.map(token)}:{}),...(c.batches?{batches:c.batches.map(x=>capture(x,depth+1))}:{})};}
 const m=value.message;
 if(m.kind==='delta'&&(!Array.isArray(m.upsert)||m.upsert.length>1200))throw Error('Invalid packed delta');
 return m.kind==='snapshot'?{...m,capture:capture(m.capture)}:{...m,metadata:capture(m.metadata),upsert:m.upsert.map(token)};
}
