import {publicLink} from './token-details.js';
const text=(s,n=20000)=>typeof s==='string'?s.slice(0,n):'';
const media=rows=>(Array.isArray(rows)?rows:[]).slice(0,12).filter(m=>m&&publicLink(m.url)&&['image','video','video_link'].includes(m.type)).map(m=>({type:m.type,url:publicLink(m.url),...(publicLink(m.posterUrl)?{posterUrl:publicLink(m.posterUrl)}:{})}));
export function contextEvent(record,depth=0){
 if(!record||depth>2)return null;const url=publicLink(record.content?.canonicalUrl);if(!url)return null;const a=record.account??{};
 return {id:text(record.content?.nativeId||url,300),url,sourceUrl:url,platform:record.platform==='x'?'twitter':text(record.platform,40),sourceLabel:text(a.displayName,120),title:text(record.content?.text,1600),body:text(record.content?.text),author:{name:text(a.displayName||a.handle,120),handle:text(a.handle,80),nativeId:text(a.nativeId,80),profileUrl:publicLink(a.canonicalProfileUrl),avatar:publicLink(a.avatarUrl),followers:Number.isFinite(Number(a.followers))&&a.followers!=null?Number(a.followers):null},media:media(record.media),publishedAt:record.publishedAt??null,cachedAt:record.observedAt??null,contexts:(Array.isArray(record.contexts)?record.contexts:[]).slice(0,4).map(c=>({relation:text(c.relation,30),event:contextEvent(c.record,depth+1)})).filter(c=>c.event)};
}
export function enrichEvent(brief,raw){
 if(!raw||raw.id!==brief.id)return brief;const social=contextEvent(raw.socialMetadata);if(!social)return brief;
 const id=url=>{try{return new URL(url).pathname.match(/\/status\/(\d+)/)?.[1]??null;}catch{return null;}};
 if(id(brief.url)&&id(social.url)!==id(brief.url))return brief;
 return {...brief,...social,id:brief.id,url:brief.url,body:social.body||brief.body,title:social.title||brief.title,cachedAt:brief.cachedAt,publishedAt:brief.publishedAt,sourceUrl:brief.sourceUrl||social.sourceUrl,media:social.media.length?social.media:brief.media,detailLoaded:true};
}
export function contentMissing(event){return /^(quoted|replied|reposted|retweeted)$/i.test((event.body||event.title||'').trim())&&!event.media?.length&&!event.contexts?.length;}
// A compact excerpt must never turn a cut URL into a different clickable destination.
export function postExcerpt(body,limit=220){
 if(body.length<=limit)return body;
 let end=limit;
 for(const match of body.matchAll(/https?:\/\/[^\s<>]+/g))if(match.index<end&&match.index+match[0].length>end){end=match.index;break;}
 return body.slice(0,end).trimEnd()+'…';
}
