import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {Token} from './AgentTradingJev';
import {createTokenArrivals,TOKEN_NOTICE_MS,type TokenArrival} from './token-arrivals';
import {tokenKey} from './token-selection';
import {logoUrl} from './market-activity';
import {chainMark} from './network-marks';
import {tokenTicker,compactCap} from './token-details';
import {numericField} from './token-selection';
import {tokenAppearance} from './token-appearance';
import {trackedSocialKeys} from './social-trace';
import {SocialPost} from './SocialPost';
import type {useNewsSnapshot} from './useNewsSnapshot';
import './token-trace.css';
import './token-arrival.css';
import {TOKEN_ACTIVITY_POLICY} from './token-eligibility';

export function TokenArrivalNotice({tokens,visibleKeys,eligibleKeys=visibleKeys,onSelect,onArrival,historyKey,news}:{tokens:Token[];visibleKeys:string[];eligibleKeys?:string[];onSelect:(key:string)=>void;onArrival?:(keys:string[])=>void;historyKey?:string;news?:ReturnType<typeof useNewsSnapshot>}){
 const [detector]=useState(()=>{try{return createTokenArrivals({storage:window.localStorage,storageKey:historyKey,pendingMs:TOKEN_ACTIVITY_POLICY.introMs});}catch{return createTokenArrivals({pendingMs:TOKEN_ACTIVITY_POLICY.introMs});}}),[notice,setNotice]=useState<TokenArrival|null>(null);
 const arrivalHandler=useRef(onArrival);arrivalHandler.current=onArrival;
 useEffect(()=>{const next=detector.ingest(tokens,eligibleKeys,Date.now());if(next){setNotice(next);arrivalHandler.current?.(next.tokens.map(tokenKey));}},[tokens,eligibleKeys,detector]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),Math.max(0,notice.expiresAt-Date.now()));return()=>clearTimeout(timer);},[notice]);
 const shown=notice?.tokens.filter(token=>visibleKeys.includes(tokenKey(token)))??[];
 const linkedKeys=trackedSocialKeys(news?.snapshot?.links??[],news?.now),token=shown.find(t=>linkedKeys.has(tokenKey(t)))??shown[0];
 if(!notice||!token)return null;
 const logo=logoUrl(token.logo),chain=token.chain==='robinhood'?'Robinhood':token.chain==='bsc'?'BSC':'Solana';
 const post=(news?.snapshot?.links??[]).filter(link=>trackedSocialKeys([link],news?.now).has(tokenKey(token))).sort((a,b)=>Date.parse(b.event.publishedAt??'')-Date.parse(a.event.publishedAt??''))[0];
 return <aside className="token-arrival token-arrival-social" key={notice.id} role="status" aria-label="New token detected" data-token-key={tokenKey(token)} style={{'--token-accent':tokenAppearance(token).color,'--notice-duration':TOKEN_NOTICE_MS+'ms'} as CSSProperties}>
  <button className="token-arrival-open" aria-label={'Locate '+token.name+' in the field'} onClick={()=>{onSelect(tokenKey(token));setNotice(null);}}>
   <span className="token-arrival-logo">{token.name.slice(0,2)}{logo&&<img src={logo} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>}</span>
   <span className="token-arrival-copy"><small><i/>NEW TOKEN{shown.length>1?` · +${shown.length-1} MORE`:''}</small><strong>{tokenTicker(token)} <em>{compactCap(numericField(token,'market_cap'))}</em></strong><span><img src={chainMark(token.chain)} alt=""/>{chain}<b>Locate ↗</b></span></span>
  </button>
  {post&&<div className="token-arrival-post"><SocialPost event={post.event} compact basisUrl={post.evidence.filter(e=>e.tokenKey===tokenKey(token)).every(e=>e.inferred)?post.evidence.find(e=>e.tokenKey===tokenKey(token))?.basisUrl:undefined}/></div>}
  <button className="token-arrival-close" aria-label="Dismiss token notification" onClick={()=>setNotice(null)}>×</button>
  <i className="token-arrival-lifetime"/>
 </aside>;
}
