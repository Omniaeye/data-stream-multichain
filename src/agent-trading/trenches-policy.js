import {canonicalChain,numericField,tokenKey} from './token-selection.js';
import {compactCap,tokenSocials} from './token-details.js';
import {tokenActivity} from './token-eligibility.js';
import {launchTime,discoveryTime} from './trenches-model.js';
import {matchesNetworkLaunchpad,validLaunchpadKey,launchpadNetworks,launchpadBlockKey,validLaunchpadBlockKey} from './trenches-launchpad.js';

export const TRENCHES_DEFAULTS={chains:[],launchpads:null,launchpadsByChain:{},mode:'active',hot:false,quickActions:true,postsOnly:false,feed:true,brain:true,motion:true,minLiquidity:1000,minVolume:100,minHolders:5,minTransactions:3,maxTop10:null,maxCreator:null,hideRisk:true,blocks:[]};
export function money(value){return value==null||!Number.isFinite(value)?'—':value>0&&value<.01?'<$0.01':'$'+compactCap(value);}
export function socialIdentity(value){
 if(typeof value!=='string')return null;let raw=value.trim();if(/^@\w{1,15}$/.test(raw))raw='https://x.com/'+raw.slice(1);
 try{const u=new URL(raw),host=u.hostname.toLowerCase().replace(/^www\./,'');if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;
  const parts=u.pathname.split('/').filter(Boolean);if(['x.com','twitter.com','mobile.twitter.com'].includes(host)){const handle=parts[0];return handle&&!['i','intent','search','home','share'].includes(handle)&&/^\w{1,15}$/.test(handle)?'x:'+handle.toLowerCase():null;}
  if(['t.me','telegram.me'].includes(host)){const channel=parts[0]==='s'?parts[1]:parts[0];return channel&&/^\w{5,}$/.test(channel)?'telegram:'+channel.toLowerCase():null;}
  if(!host.includes('.')||host.endsWith('.local')||/^[\d.]+$/.test(host))return null;return 'domain:'+host;
 }catch{return null;}
}
export function authorIdentity(event){const a=event.author;return a?.profileUrl?socialIdentity(a.profileUrl):a?.handle&&['twitter','x'].includes(event.platform)?socialIdentity('@'+a.handle.replace(/^@/,'')):null;}
const normalized=value=>String(value??'').normalize('NFKC').trim().toLowerCase();
export const blockId=block=>`${block.scope??'all'}|${block.key}`;
export function tickerLabel(token){return String(token.symbol||token.fields.find(f=>['symbol','ticker'].includes(f.key))?.value||token.name||'').trim().replace(/^\$+/,'');}
export function tickerIdentity(token){const value=normalized(tickerLabel(token));return value?'ticker:'+value:null;}
export function postIdentity(value){try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;const host=u.hostname.toLowerCase().replace(/^www\./,'');if(['x.com','twitter.com','mobile.twitter.com'].includes(host)){const id=u.pathname.match(/^\/(?:\w+|i)\/status\/(\d+)(?:\/|$)/)?.[1];if(id)return 'post:x:'+id;}return null;}catch{return null;}}
function eventMatches(event,block){const key=authorIdentity(event);if(block.key.startsWith('keyword:')){const word=normalized(block.key.slice(8));return !!word&&normalized(event.body||event.title).includes(word);}return block.key===key||block.key===postIdentity(event.url)||(event.author?.nativeId&&block.nativeId===event.author.nativeId&&block.key.startsWith('x:'));}
export function blockedEvent(event,blocks){return blocks.some(b=>b.scope!=='tokens'&&eventMatches(event,b));}
export function tokenBlocked(token,links,blocks){
 const rules=blocks.filter(b=>b.scope!=='posts'),keys=new Set(rules.map(b=>b.key));
 if(keys.has(launchpadBlockKey(token)))return true;
 if(keys.has('token:'+tokenKey(token))||keys.has(tickerIdentity(token))||tokenSocials([token]).some(s=>keys.has(socialIdentity(s.url))||keys.has(postIdentity(s.url))))return true;
 if(rules.some(b=>b.key.startsWith('keyword:')&&normalized(b.key.slice(8))&&normalized(token.name+' '+tickerLabel(token)).includes(normalized(b.key.slice(8)))))return true;
 return links.some(link=>rules.some(b=>eventMatches(link.event,b))&&link.evidence.some(e=>e.tokenKey===tokenKey(token)&&!e.inferred&&e.match!=='author_profile'));
}
export function readPreferences(raw){
 let p;try{p=typeof raw==='string'?JSON.parse(raw):raw;}catch{}p=p&&typeof p==='object'?p:{};
 const out={...TRENCHES_DEFAULTS,chains:Array.isArray(p.chains)?[...new Set(p.chains.filter(c=>['solana','bsc','robinhood'].includes(c)))]:[],blocks:Array.isArray(p.blocks)?p.blocks.filter(b=>b&&typeof b.key==='string'&&(/^(x|telegram|domain|token|ticker|post|keyword):.+/.test(b.key)||validLaunchpadBlockKey(b.key))&&typeof b.label==='string').slice(0,500).map(b=>({...b,scope:['posts','tokens'].includes(b.scope)?b.scope:'all'})):[]};
 for(const k of ['postsOnly','feed','brain','motion','hideRisk','hot','quickActions'])if(typeof p[k]==='boolean')out[k]=p[k];
 out.launchpads=Array.isArray(p.launchpads)?[...new Set(p.launchpads.filter(validLaunchpadKey))].slice(0,1200):null;
 out.launchpadsByChain={};
 for(const chain of launchpadNetworks){const selection=p.launchpadsByChain?.[chain];if(selection===null||Array.isArray(selection))out.launchpadsByChain[chain]=selection===null?null:[...new Set(selection.filter(validLaunchpadKey))].slice(0,1200);}
 if(['new','active'].includes(p.mode))out.mode=p.mode;
 for(const k of ['minLiquidity','minVolume','minHolders','minTransactions'])if(Number.isFinite(p[k])&&p[k]>=0)out[k]=Math.min(p[k],1e12);
 for(const k of ['maxTop10','maxCreator'])if(p[k]===null||Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100)out[k]=p[k];
 return out;
}
export function tokenMatches(token,prefs,links,now=Date.now(),captureTime=now){
 if(prefs.chains.length&&!prefs.chains.includes(canonicalChain(token.chain)))return false;
 if(!matchesNetworkLaunchpad(token,prefs))return false;
 if(tokenBlocked(token,links,prefs.blocks))return false;
 // Feed-only blocks do not revoke the captured link or hide its token.
 if(prefs.postsOnly&&!links.length)return false;
 const born=launchTime(token)??discoveryTime(token);if(!born||born>now+2000||now-born>86400000)return false;
 const truth=value=>[true,1,'1','true'].includes(value);
 if(prefs.hideRisk&&token.fields.some(f=>['is_honeypot','is_wash_trading'].includes(f.key)&&truth(f.value)))return false;
 for(const [key,max] of [['top_10_holder_rate',prefs.maxTop10],['creator_balance_rate',prefs.maxCreator]])if(max!=null){const n=numericField(token,key);if(n===null||n>1||n*100>max)return false;}
 if(prefs.mode==='new')return true;
 // Freeze the observation clock on transport failure, while the UI states Updating.
 // A fresh combined capture still ages independently delayed per-source evidence.
 const metrics=tokenActivity(token,captureTime),liquidity=numericField(token,'liquidity'),holders=numericField(token,'holder_count');
 return !!metrics&&liquidity!==null&&liquidity>=prefs.minLiquidity&&holders!==null&&holders>=prefs.minHolders&&metrics.volume!==null&&metrics.volume>=prefs.minVolume&&metrics.swaps!==null&&metrics.swaps>=prefs.minTransactions;
}
export function groupTokens(tokens,byToken,blocks=[],hot=false){
 const groups=new Map();
 for(const token of tokens){const links=(byToken.get(tokenKey(token))??[]).filter(l=>!blockedEvent(l.event,blocks.filter(b=>b.scope!=='posts')));const primary=links[0],key=primary?.event.url??'unlinked';if(!groups.has(key))groups.set(key,{key,link:primary??null,tokens:[]});groups.get(key).tokens.push(token);}
 const result=[...groups.values()];
 if(hot)for(const group of result)if(group.link)group.tokens.sort((a,b)=>(numericField(b,'market_cap')??-1)-(numericField(a,'market_cap')??-1)||(launchTime(b)??discoveryTime(b))-(launchTime(a)??discoveryTime(a))||tokenKey(a).localeCompare(tokenKey(b)));
 return result;
}
