import {tokenKey} from './token-selection.js';

const capFormats={k:new Intl.NumberFormat('en-US',{maximumFractionDigits:1}),M:new Intl.NumberFormat('en-US',{maximumFractionDigits:3}),B:new Intl.NumberFormat('en-US',{maximumFractionDigits:3}),small:new Intl.NumberFormat('en-US',{maximumFractionDigits:2})};
export function compactCap(value){
 if(value===null||value===undefined||value===''||typeof value==='boolean')return '—';
 const n=Number(value);if(!Number.isFinite(n)||n<0)return '—';
 const units=[[1e9,'B'],[1e6,'M'],[1e3,'k']];
 for(const [scale,suffix] of units)if(n>=scale||(scale===1e6&&n>=999950)||(scale===1e9&&n>=999999500))return capFormats[suffix].format(n/scale)+suffix;
 return capFormats.small.format(n);
}
export function tokenTicker(token){return '$'+String(token.symbol||token.name||'').replace(/^\$+/,'');}

export function publicLink(value){
 if(typeof value!=='string'||value.length>2048)return null;
 try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port)return null;
  if(!u.hostname.includes('.')||u.hostname==='localhost'||u.hostname.endsWith('.local')||u.hostname.endsWith('.localhost')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':'))return null;
  if([...u.searchParams.keys()].some(k=>/secret|password|api.?key|signature|access.?token/i.test(k)))return null;
  return u.href;
 }catch{return null;}
}
const platforms=[['x',['x.com','twitter.com']],['telegram',['t.me','telegram.me']],['instagram',['instagram.com']],['discord',['discord.gg','discord.com']],['youtube',['youtube.com','youtu.be']],['tiktok',['tiktok.com']],['reddit',['reddit.com']],['github',['github.com']],['facebook',['facebook.com']],['threads',['threads.net','threads.com']],['linkedin',['linkedin.com']],['bluesky',['bsky.app']],['truthsocial',['truthsocial.com']]];
const names={x:'X',telegram:'Telegram',instagram:'Instagram',discord:'Discord',youtube:'YouTube',tiktok:'TikTok',reddit:'Reddit',github:'GitHub',facebook:'Facebook',threads:'Threads',linkedin:'LinkedIn',bluesky:'Bluesky',truthsocial:'Truth Social',web:'Website'};
export function tokenSocials(tokens){
 const links=new Map();
 for(const token of tokens)for(const field of token.fields??[]){
  if(!/^(website|twitter_username|twitter_handle|twitter|x|telegram|instagram|discord|youtube|tiktok|reddit|github|facebook|threads|linkedin|bluesky|source_url)(?:_url)?$/.test(field.key))continue;
  if(field.key==='twitter_handle'&&token.fields.some(f=>['twitter','twitter_username'].includes(f.key)&&typeof f.value==='string'&&f.value.trim()))continue;
  let raw=field.value;if(typeof raw!=='string')continue;raw=raw.trim();
  if(['twitter','twitter_username','twitter_handle','x'].includes(field.key)&&/^@?[\w]{1,15}$/.test(raw))raw='https://x.com/'+raw.replace(/^@/,'');
  if(['twitter','twitter_username','x'].includes(field.key)&&/^@?[\w]{1,15}\/status\/\d+(?:[/?#].*)?$/.test(raw))raw='https://x.com/'+raw.replace(/^@/,'');
  if(field.key==='telegram'&&/^@?[\w]{5,32}$/.test(raw))raw='https://t.me/'+raw.replace(/^@/,'');
  if(/^(?:www\.|x\.com\/|twitter\.com\/|t\.me\/)/i.test(raw))raw='https://'+raw;
  const url=publicLink(raw);if(!url||links.has(url))continue;
  const host=new URL(url).hostname.toLowerCase();
  const platform=platforms.find(([,hosts])=>hosts.some(h=>host===h||host.endsWith('.'+h)))?.[0]??'web';
  links.set(url,{url,platform,label:names[platform],field:field.key,path:field.path,captureId:token.evidence?.captureId??null});
 }
 return [...links.values()];
}

// These are the snapshots actually in the current response, not an archive query.
export function tokenSnapshots(token,capture){
 const key=tokenKey(token),seen=new Set(),result=[];
 for(const item of [token,...(capture?.batches??[]).flatMap(batch=>batch.tokens.filter(t=>tokenKey(t)===key).map(t=>({...t,evidence:t.evidence??{captureId:batch.captureId,captureHash:batch.captureHash,receivedAt:batch.receivedAt}})))]){
  const id=item.evidence?.captureId??'current';if(seen.has(id))continue;seen.add(id);result.push(item);
 }
 return result;
}
