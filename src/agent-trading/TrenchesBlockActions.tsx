import type {Token} from './AgentTradingJev';
import type {NewsLink} from './useNewsSnapshot';
import {tokenSocials} from './token-details';
import {tokenKey} from './token-selection';
import {authorIdentity,postIdentity,socialIdentity,tickerIdentity,tickerLabel,type Block} from './trenches-policy';
import {Actions,Icon,chainName} from './TrenchesUI';
import {launchpadBlockKey,tokenLaunchpad} from './trenches-launchpad';

type Props={onBlock:(block:Block)=>void;onKeyword?:()=>void};
export function PostBlockActions({event,onBlock,onKeyword}:{event:NewsLink['event']}&Props){
 const identity=authorIdentity(event),post=postIdentity(event.url),label='@'+(event.author?.handle||identity?.slice(2)||event.sourceLabel),nativeId=(event.author as {nativeId?:string})?.nativeId;
 return <Actions label={'Actions for '+label}>
  <a href={event.sourceUrl||event.url} target="_blank" rel="noopener noreferrer"><Icon name="arrow"/>Open original post</a>
  {post&&<button onClick={()=>onBlock({key:post,label:'Post · '+label,scope:'posts'})}><Icon name="block"/>Block this post</button>}
  {identity&&<><button onClick={()=>onBlock({key:identity,label,nativeId,scope:'posts'})}><Icon name="block"/>Block profile in feed</button><button onClick={()=>onBlock({key:identity,label,nativeId,scope:'tokens'})}><Icon name="block"/>Block tokens from this profile</button><button onClick={()=>onBlock({key:identity,label,nativeId,scope:'all'})}><Icon name="block"/>Block profile + tokens</button></>}
  {onKeyword&&<button onClick={onKeyword}><Icon name="filter"/>Block keyword…</button>}
 </Actions>;
}

export function TokenBlockActions({token,links=[],label='Token actions',onBlock,onKeyword}:{token:Token;links?:NewsLink[];label?:string}&Props){
 const ticker=tickerIdentity(token),venue=tokenLaunchpad(token),venueBlock=launchpadBlockKey(token),socials=new Map<string,string>();
 for(const s of tokenSocials([token])){const key=socialIdentity(s.url);if(key)socials.set(key,key.replace(/^[^:]+:/,''));}
 for(const link of links)if(link.evidence.some(e=>e.tokenKey===tokenKey(token)&&!e.inferred&&e.match!=='author_profile')){const key=authorIdentity(link.event);if(key)socials.set(key,key.slice(2));}
 return <Actions label={label}>
  <button onClick={()=>onBlock({key:'token:'+tokenKey(token),label:token.name+' · '+chainName(token.chain),scope:'tokens'})}><Icon name="block"/>Block this token</button>
  {ticker&&<button onClick={()=>onBlock({key:ticker,label:tickerLabel(token),scope:'tokens'})}><Icon name="block"/>Block ticker {tickerLabel(token)}</button>}
  {venue&&venueBlock&&<button onClick={()=>onBlock({key:venueBlock,label:venue.label+' · '+chainName(token.chain),scope:'tokens'})}><Icon name="block"/>Block launchpad · {venue.label} ({chainName(token.chain)})</button>}
  {[...socials].map(([key,value])=><button key={key} onClick={()=>onBlock({key,label:key.startsWith('x:')?'@'+value:value,scope:'tokens'})}><Icon name="block"/>{key.startsWith('x:')?'Block tokens · @':'Block tokens · '}{value}</button>)}
  {onKeyword&&<button onClick={onKeyword}><Icon name="filter"/>Block keyword…</button>}
 </Actions>;
}
