import {useState} from 'react';
import type {NewsLink} from './useNewsSnapshot';
import {blockedEvent,postIdentity,type Block} from './trenches-policy';
import {contentMissing,postExcerpt} from './trenches-social';
import {publicLink} from './token-details';
import {PlatformIcon} from '../components/PlatformIcon';
import {RecordMedia} from '../components/RecordMedia';
import {PostBlockActions} from './TrenchesBlockActions';
import {Icon} from './TrenchesUI';

const date=(value:string|null)=>{const n=Date.parse(value??'');return Number.isFinite(n)?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(n)+' UTC':'';};
function Content({body}:{body:string}){const sole=publicLink(body.trim());if(sole&&/https:\/\/(x|twitter)\.com\/i\/article\//.test(sole))return <a className="tr-article-link" href={sole} target="_blank" rel="noopener noreferrer"><PlatformIcon platform="x" size={24}/><span><strong>X Article</strong><small>Read the original article</small></span><Icon name="arrow"/></a>;return <p className="tr-post-body">{body.split(/(https?:\/\/[^\s<>]+)/g).map((part,i)=>{const href=publicLink(part);return href?<a key={i} href={href} target="_blank" rel="noopener noreferrer">{part}</a>:part;})}</p>;}
export function TrenchesPost({link,onBlock,onKeyword,blocks=[],depth=0,compact=false,ancestors=[]}:{link:NewsLink;onBlock?:(block:Block)=>void;onKeyword?:()=>void;blocks?:Block[];depth?:number;compact?:boolean;ancestors?:string[]}){
 const [expanded,setExpanded]=useState(false);
 const event=link.event as NewsLink['event']&{contexts?:Array<{relation:string;event:NewsLink['event']}>;author?:NewsLink['event']['author']&{nativeId?:string}};
 const identity=postIdentity(event.url)||event.url,seen=new Set([...ancestors,identity]);
 const missing=contentMissing(event),platform=event.platform==='twitter'?'x':event.platform,author=event.author,authorName=author?.name||author?.handle||event.sourceLabel||'Source';
 const contexts=depth<2?(event.contexts??[]).filter(c=>{const id=postIdentity(c.event.url)||c.event.url;if(seen.has(id)||blockedEvent(c.event,blocks))return false;seen.add(id);return true;}):[];
 const body=missing?'Original context unavailable.':event.body||event.title,collapsed=compact&&!expanded,hasMore=body.length>220||contexts.length>0||!!event.media?.length;
 const relation=(value:string)=>['quotes','quote'].includes(value)?'Quoted post':['replies_to','reply_to','reply'].includes(value)?'Reply to':['reposts','repost','retweets'].includes(value)?'Reposted':'Source context';
 if(blockedEvent(event,blocks))return null;
 return <article className="tr-post" data-depth={depth} data-compact={collapsed}>
  <header className="tr-post-head"><span className="tr-author-avatar"><span>{authorName.slice(0,2)}</span>{author?.avatar?<img src={author.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>:<PlatformIcon platform={platform} size={21}/>}</span><div><strong>{authorName}</strong><span>{author?.handle&&'@'+author.handle.replace(/^@/,'')}{author?.followers!=null&&' · '+new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(author.followers)}</span></div><a className="tr-platform-link" href={event.sourceUrl||event.url} target="_blank" rel="noopener noreferrer" aria-label="Open source post"><PlatformIcon platform={platform} size={17}/></a>{onBlock&&<PostBlockActions event={event} onBlock={onBlock} onKeyword={onKeyword}/>}</header>
  <Content body={collapsed?postExcerpt(body):body}/>
  {!collapsed&&<RecordMedia record={event} url={event.sourceUrl||event.url}/>}
  {collapsed?contexts.slice(0,1).map(context=><button className="tr-context-preview" key={context.event.url} onClick={()=>setExpanded(true)}><small>{relation(context.relation)} · {context.event.author?.name||context.event.author?.handle||context.event.sourceLabel}</small><span>{(context.event.body||context.event.title).slice(0,110)}{(context.event.body||context.event.title).length>110?'…':''}</span></button>):contexts.map(context=><section className="tr-quote" key={context.event.url}><div className="tr-quote-label"><span/>{relation(context.relation)}</div><TrenchesPost link={{...link,event:context.event,evidence:[]}} blocks={blocks} onBlock={onBlock} onKeyword={onKeyword} depth={depth+1} ancestors={[...ancestors,identity]}/></section>)}
  <footer className="tr-post-footer"><time dateTime={event.publishedAt??undefined}>{date(event.publishedAt)}</time>{compact&&hasMore?<button className="tr-expand-post" onClick={()=>setExpanded(!expanded)}>{expanded?'Collapse':'Full post'+(event.media?.length?' + media':'')}<Icon name="chevron"/></button>:<a href={event.sourceUrl||event.url} target="_blank" rel="noopener noreferrer">Open post <Icon name="arrow"/></a>}</footer>
  {!!link.evidence.length&&link.evidence.every(e=>e.inferred)&&<a className="tr-inferred" href={link.evidence[0]?.basisUrl} target="_blank" rel="noopener noreferrer">Related coverage · inferred connection <Icon name="arrow"/></a>}
 </article>;
}
