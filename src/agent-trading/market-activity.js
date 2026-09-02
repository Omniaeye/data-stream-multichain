import {canonicalChain,tokenKey,numericField} from './token-selection.js';
export function logoUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.length<=253?u.href:null;}catch{return null;}}
export function marketTokens(tokens,view,now=Date.now()){
 return tokens.filter(t=>{if(view!=='discovery')return true;const born=numericField(t,'creation_timestamp')??numericField(t,'created_timestamp');return born!==null&&born>0&&born*1000<=now&&now-born*1000<=86400000;})
 .sort((a,b)=>(numericField(a,'rank')??Infinity)-(numericField(b,'rank')??Infinity)||tokenKey(a).localeCompare(tokenKey(b)));
}
export function captureActivity(previous,next){
 if(!next||previous?.captureId===next.captureId)return {events:[],changed:[],observed:0,captures:0};
 const old=new Map((previous?.tokens??[]).map(t=>[tokenKey(t),t])),current=new Set(next.tokens.map(tokenKey));const events=[],changed=new Set(),sources=new Set();let observed=0;
 for(const t of next.tokens){const key=tokenKey(t),before=old.get(key),e=t.evidence??next;
  const priorSource=(previous?.tokens??[]).find(p=>canonicalChain(p.chain)===canonicalChain(t.chain))?.evidence;
  if(priorSource?.captureId===e.captureId)continue;
  if(!sources.has(e.captureId)){sources.add(e.captureId);events.push({id:e.captureId+':capture',kind:'capture',chain:t.chain,text:'Ranking capture received',at:e.receivedAt,captureId:e.captureId});}
  observed+=t.fields.length;
  if(!before){if(previous){changed.add(key);events.push({id:e.captureId+':'+key,kind:'entry',chain:t.chain,token:key,text:t.name+' entered the observed ranking',at:e.receivedAt,captureId:e.captureId});}continue;}
  const fields=new Map(before.fields.map(f=>[f.key,f.value]));
  for(const f of t.fields){if(!fields.has(f.key)||fields.get(f.key)!==f.value){changed.add(key);events.push({id:e.captureId+':'+key+':'+f.key,kind:'change',chain:t.chain,token:key,text:t.name+' · '+f.key,before:fields.has(f.key)?fields.get(f.key):null,after:f.value,at:e.receivedAt,captureId:e.captureId});}}
 }
 for(const t of previous?.tokens??[])if(!current.has(tokenKey(t)))events.push({id:next.captureId+':exit:'+tokenKey(t),kind:'exit',chain:t.chain,token:tokenKey(t),text:t.name+' left the observed ranking',at:next.receivedAt,captureId:next.captureId});
 return {events,changed:[...changed],observed,captures:sources.size};
}
