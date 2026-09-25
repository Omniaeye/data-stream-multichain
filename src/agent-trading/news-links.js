import {canonicalChain,tokenKey} from './token-selection.js';
import {mediaUrl,recordMedia} from '../media.mjs';
import {tokenSocials} from './token-details.js';
import {socialProfileUrl,authorProfile} from './social-trace.js';
import {coverageSignature,sameCoverage} from './story-coverage.js';
export const NEWS_WINDOW_MS=3*60*60*1000;
export function recentNews(event,now=Date.now()){
 const published=Date.parse(event?.publishedAt);return Number.isFinite(published)&&published<=now&&now-published<=NEWS_WINDOW_MS;
}

// Content identity only. A token-supplied link does not establish endorsement.
export function contentUrl(value){
 if(typeof value!=='string'||value.length>2048)return null;
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  if([...u.searchParams.keys()].some(k=>/token|secret|password|api.?key|signature/i.test(k)))return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  if(['x.com','twitter.com','mobile.twitter.com'].includes(host)){
   const id=u.pathname.match(/^\/(?:[\w]+|i\/web)\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/)?.[1];
   return id?'https://x.com/i/status/'+id:null;
  }
  if(host==='instagram.com'){
   const match=u.pathname.match(/^\/(?:p|reel|tv)\/([\w-]+)\/?$/);return match?'https://instagram.com/p/'+match[1]:null;
  }
  if(['youtube.com','m.youtube.com','youtu.be'].includes(host)){
   const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')??u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/)?.[1];
   return /^[\w-]{11}$/.test(id??'')?'https://youtube.com/watch?v='+id:null;
  }
  if(['t.me','telegram.me'].includes(host)){
   const match=u.pathname.match(/^\/(?:s\/)?([\w]+)\/(\d+)\/?$/);return match?'https://t.me/'+match[1].toLowerCase()+'/'+match[2]:null;
  }
  if(['threads.net','threads.com'].includes(host)){
   const id=u.pathname.match(/^\/(?:@[^/]+\/post|t)\/([\w-]+)\/?$/)?.[1];return id?'https://threads.com/t/'+id:null;
  }
  if(['facebook.com','m.facebook.com'].includes(host)){
   const match=u.pathname.match(/^\/(?:[^/]+\/posts|reel)\/[\w-]+\/?$/);if(!match)return null;
   return 'https://facebook.com'+u.pathname.replace(/\/+$/,'');
  }
  if(['discord.com','discord.gg'].includes(host))return null;
  if(['reddit.com','old.reddit.com','m.reddit.com'].includes(host)){
   const match=u.pathname.match(/^\/(?:r\/[^/]+\/)?comments\/([a-z0-9]+)(?:\/[^/]+)?(?:\/([a-z0-9]+))?\/?$/i);
   return match?'https://reddit.com/comments/'+match[1].toLowerCase()+(match[2]?'/comment/'+match[2].toLowerCase():''):null;
  }
  // Homepages and profiles are not articles. Other article URLs require an
  // exact match to an actual content record returned by OMNIA.
  const path=u.pathname.replace(/\/+$/,'');if(!path||/^\/(?:@[^/]+|profile|user|users|author|about|home)(?:\/|$)/i.test(path))return null;
  u.hostname=host;u.pathname=path;u.hash='';
  for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k)||['fbclid','gclid'].includes(k.toLowerCase()))u.searchParams.delete(k);
  u.searchParams.sort();return u.href;
 }catch{return null;}
}

export function tokenNewsReferences(tokens){
 const result=[];
 for(const token of tokens){
  if(!canonicalChain(token.chain)||!token.evidence?.captureId||!token.evidence?.captureHash)continue;
  const seen=new Set();
  for(const link of tokenSocials([token])){
   const profile=socialProfileUrl(link.url),url=profile??contentUrl(link.url);if(!url||seen.has(url))continue;seen.add(url);
   result.push({url,kind:profile?'profile':'content',tokenKey:tokenKey(token),field:link.field,path:link.path,sourceUrl:link.url,
    captureId:token.evidence.captureId,captureHash:token.evidence.captureHash,receivedAt:token.evidence.receivedAt??null});
  }
 }
 return result;
}

export function newsRecord(event,at=new Date().toISOString()){
 if(!event||typeof event.id!=='string'||typeof event.title!=='string'||!event.title.trim())return null;
 if(!recentNews(event,Date.parse(at)))return null;
 if(/profile|metadata|token_/i.test(event.eventType??'')||event.publicationStatus==='unpublished')return null;
 const url=contentUrl(event.url);if(!url)return null;
 const account=event.socialMetadata?.account??{},followers=account.followers;
 const count=typeof followers==='number'?followers:typeof followers==='string'&&/^\d+$/.test(followers.trim())?Number(followers):null;
 const rawMedia=event.media??event.socialMetadata?.media;
 const media=recordMedia({...event,media:Array.isArray(rawMedia)?rawMedia.filter(m=>m&&typeof m.url==='string').slice(0,16):[]});
 return {id:event.id,url,sourceUrl:event.url,title:event.title.slice(0,1600),body:String(event.socialMetadata?.content?.text||event.body||event.title).slice(0,20000),media,platform:String(event.platform??'news').slice(0,40),
  author:{name:String(account.displayName||account.handle||event.sourceLabel||event.platform||'').slice(0,120),handle:String(account.handle??'').slice(0,80),profileUrl:authorProfile(event),avatar:mediaUrl(account.avatarUrl)??null,followers:Number.isSafeInteger(count)&&count>=0?count:null},
  sourceLabel:String(event.sourceLabel??'').slice(0,120),publishedAt:event.publishedAt??null,
  observedAt:event.observedAt??null,cachedAt:at};
}

export function linkNews(references,events,now=Date.now()){
 const eligible=events.filter(event=>recentNews(event,now)&&!(/^(reposted|retweeted)$/i.test((event.body||event.title||'').trim())&&!event.media?.length)),byUrl=new Map(eligible.map(event=>[event.url,event])),byProfile=new Map(),groups=new Map();
 const signatures=new Map(eligible.map(event=>[event.url,coverageSignature(event)]));
 for(const event of eligible){const profile=authorProfile(event);if(profile){if(!byProfile.has(profile))byProfile.set(profile,[]);byProfile.get(profile).push(event);}}
 for(const ref of references){
  const source=byUrl.get(ref.url),matches=ref.kind==='profile'?(byProfile.get(ref.url)??[]):source?[source,...eligible.filter(event=>event.url!==source.url&&sameCoverage(signatures.get(source.url),signatures.get(event.url)))]:[];
  for(const event of matches){
   if(!groups.has(event.url))groups.set(event.url,{event,relation:'token_reference',evidence:[]});
   const evidence=groups.get(event.url).evidence;
   const inferred=ref.kind!=='profile'&&event.url!==ref.url;
   if(!evidence.some(e=>e.tokenKey===ref.tokenKey&&e.url===ref.url))evidence.push({...ref,match:inferred?'related_coverage':ref.kind==='profile'?'author_profile':'post_url',...(inferred?{basisUrl:source.url,basisTitle:source.title,method:'lexical-overlap-v1',inferred:true}:{})});
  }
 }
 return [...groups.values()].sort((a,b)=>Date.parse(b.event.publishedAt??b.event.cachedAt)-Date.parse(a.event.publishedAt??a.event.cachedAt));
}
