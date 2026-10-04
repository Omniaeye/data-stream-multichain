import {useMemo} from 'react';
import type {Token} from './AgentTradingJev';
import {tokenKey} from './token-selection';
import {logoUrl} from './market-activity';
import {storiesWithEvidence} from './story-evidence';
import {recentNews} from './news-links';
import {chainMark} from './network-marks';
import './news-token-links.css';
import type {useNewsSnapshot,NewsLink} from './useNewsSnapshot';

export type NewsSelection={key:string;token:Token;story:NewsLink;anchor:HTMLElement};

export function NewsTokenLinks({tokens,onSelect,news}:{tokens:Token[];onSelect:(selection:NewsSelection)=>void;news:ReturnType<typeof useNewsSnapshot>}){
 const {snapshot,disconnected,now}=news;
 const visible=useMemo(()=>new Map(tokens.map(t=>[tokenKey(t),t])),[tokens]);
 const links=useMemo(()=>storiesWithEvidence((snapshot?.links??[]).filter(link=>recentNews(link.event,now)),tokens).map(link=>({...link,evidence:link.evidence.filter(ref=>visible.has(ref.tokenKey))})),[snapshot,tokens,now,visible]);
 const stale=disconnected||snapshot?.meta.status==='stale';
 return <aside className="news-token-links" aria-label="News linked by tokens">
  <header><h2>NEWS <span>+</span> TOKENS</h2><span title={`Published within the last three hours. Captured links and related story coverage from the available feed. Last sync: ${snapshot?.meta.lastSync??'waiting'}`}>{stale?'Updating':'LAST 3H'}</span></header>
  <div className="news-token-stories">{links.slice(0,30).map(link=><article key={link.event.url}>
   <div className="news-token-story"><div className="news-author" title={`${link.event.platform} · ${link.event.author?.handle||link.event.sourceLabel}`}>
    {link.event.author?.avatar?<img loading="lazy" decoding="async" fetchPriority="low" src={link.event.author.avatar} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>:<span className="news-author-placeholder" aria-hidden="true">{link.event.platform.slice(0,1).toUpperCase()}</span>}
    <span className="news-author-name">{link.event.author?.name||link.event.sourceLabel||link.event.platform}</span>
    {link.evidence.length>0&&link.evidence.every(ref=>ref.match==='author_profile')&&<span className="news-author-followers" title="Recent publication from a profile linked in token metadata. No direct post reference was captured.">PROFILE</span>}
    {link.event.author?.followers!=null&&<span className="news-author-followers" title={`${link.event.author.followers.toLocaleString('en-US')} followers`}>{new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(link.event.author.followers)} followers</span>}
    <time dateTime={link.event.publishedAt??undefined} title={link.event.publishedAt??''}>{Math.max(0,Math.floor((now-Date.parse(link.event.publishedAt!))/60000))||'<1'}m</time>
   </div><a href={link.event.sourceUrl??link.event.url} target="_blank" rel="noopener noreferrer" title={link.event.title}>{link.event.title}</a></div>
   <div className="news-linked-nuclei">{[...new Map(link.evidence.map(ref=>[ref.tokenKey,ref])).values()].map(ref=>{const token=visible.get(ref.tokenKey)!;const logo=logoUrl(token.logo);return <button key={ref.tokenKey} data-token-key={ref.tokenKey} onClick={event=>onSelect({key:ref.tokenKey,token,story:link,anchor:event.currentTarget})} aria-label={`Inspect ${token.name} on ${token.chain}, ${token.id}`} title={`${token.name} · ${token.chain} · ${token.id}\n${ref.inferred?'Related coverage inferred from captured post: '+ref.basisUrl:'Captured '+(ref.match==='author_profile'?'profile':'post')+' link in '+ref.field}\nToken captured: ${ref.receivedAt??'unknown'}\nPost published: ${link.event.publishedAt??'unknown'}\nReferenced by token metadata; no endorsement implied.`}>{logo?<img loading="lazy" decoding="async" fetchPriority="low" src={logo} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>:null}<span>{token.name}</span><img className="news-token-chain" src={chainMark(token.chain)} alt=""/></button>;})}</div>
  </article>)}</div>
  {!links.length&&<p>{!snapshot&&!disconnected?'Looking up recent stories…':stale?'News connection unavailable. Retrying…':'No matching stories published in the last 3 hours.'}</p>}
 </aside>;
}
