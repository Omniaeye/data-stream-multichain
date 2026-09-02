import {useEffect,useId,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {arrow,autoUpdate,computePosition,flip,offset,shift} from '@floating-ui/dom';
import type {Token,Capture} from './AgentTradingJev';
import {tokenKey,numericField} from './token-selection';
import {logoUrl} from './market-activity';
import {chainMark} from './network-marks';
import {tokenAppearance} from './token-appearance';
import {TokenSocials} from './TokenSocials';
import {tokenSnapshots} from './token-details';
import {tokenActivity} from './token-eligibility';
import {TokenTracePanel} from './TokenTracePanel';
import {trackedSocialKeys} from './social-trace';
import type {useNewsSnapshot} from './useNewsSnapshot';
import {AnimatedMarketCap} from './AnimatedMarketCap';

const compact=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:2});
const precise=new Intl.NumberFormat('en',{maximumSignificantDigits:6});
function Glyph({kind}:{kind:'copy'|'pin'|'close'}){
 return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">{kind==='copy'?<><rect x="6.5" y="6.5" width="10" height="10" rx="2"/><path d="M12.5 6.5v-3h-9v9h3"/></>:kind==='pin'?<path d="M7 3h6l-1 6 3 3H5l3-3-1-6ZM10 12v5"/>:<path d="m5 5 10 10M15 5 5 15"/>}</svg>;
}

export function TokenHoverCard({host,tokens,visibleKeys,selected,onSelectedChange,capture,news,tracing=false,onCloseTrace}:{host:RefObject<HTMLDivElement|null>;tokens:Token[];visibleKeys:string[];selected:string|null;onSelectedChange:(key:string|null)=>void;capture?:Capture;news?:ReturnType<typeof useNewsSnapshot>;tracing?:boolean;onCloseTrace?:()=>void}){
 const [hovered,setHovered]=useState<string|null>(null),[closing,setClosing]=useState(false),[copied,setCopied]=useState(false);
 const card=useRef<HTMLElement>(null),tip=useRef<HTMLSpanElement>(null),anchor=useRef<HTMLElement|null>(null),closeTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const id=useId(),key=selected??hovered,token=tokens.find(t=>tokenKey(t)===key),visible=!!key&&visibleKeys.includes(key);
 const links=tracing&&key?(news?.snapshot?.links??[]).filter(link=>trackedSocialKeys([link],news?.now).has(key)).map(link=>({...link,evidence:link.evidence.filter(ref=>ref.tokenKey===key)})):[];
 const clearClose=()=>{clearTimeout(closeTimer.current);setClosing(false);};
 const close=()=>{clearTimeout(closeTimer.current);setHovered(null);onSelectedChange(null);setClosing(false);};
 const leave=()=>{if(selected)return;clearTimeout(closeTimer.current);closeTimer.current=setTimeout(()=>{setClosing(true);closeTimer.current=setTimeout(()=>{setHovered(null);setClosing(false);},140);},180);};
 const latest=useRef({selected,leave,clearClose});latest.current={selected,leave,clearClose};
 useEffect(()=>{
  const el=host.current;if(!el)return;
  const target=(event:Event)=>(event.target instanceof Element?event.target.closest<HTMLElement>('.attractor-token'):null);
  const enter=(event:Event)=>{const node=target(event);if(!node||node.hidden||latest.current.selected)return;if(event instanceof PointerEvent&&event.pointerType==='touch')return;latest.current.clearClose();anchor.current=node;setHovered(node.dataset.tokenKey??null);};
  const exit=(event:Event)=>{const node=target(event);if(!node)return;const next=(event as PointerEvent).relatedTarget;if(next instanceof Node&&(node.contains(next)||card.current?.contains(next)))return;latest.current.leave();};
  el.addEventListener('pointerover',enter);el.addEventListener('pointerout',exit);el.addEventListener('focusin',enter);el.addEventListener('focusout',exit);
  return()=>{el.removeEventListener('pointerover',enter);el.removeEventListener('pointerout',exit);el.removeEventListener('focusin',enter);el.removeEventListener('focusout',exit);clearTimeout(closeTimer.current);};
 },[host]);
 useEffect(()=>{if(key&&(!token||!visible)){clearTimeout(closeTimer.current);setHovered(null);onSelectedChange(null);}},[key,token,visible,onSelectedChange]);
 useEffect(()=>{setCopied(false);setClosing(false);},[key]);
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
  document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);
 });
 useEffect(()=>{
  if(!key||!visible||!card.current)return;
  const reference=[...host.current!.querySelectorAll<HTMLElement>('.attractor-token')].find(el=>el.dataset.tokenKey===key);
  if(!reference)return;anchor.current=reference;const floating=card.current;let cancelled=false;
  reference.setAttribute('aria-expanded','true');reference.setAttribute('aria-controls',id);
  const update=()=>{
   if(reference.hidden||!reference.isConnected){floating.style.visibility='hidden';return;}
   void computePosition(reference,floating,{strategy:'fixed',placement:'left',middleware:[offset(15),flip({padding:12,fallbackAxisSideDirection:'start'}),shift({padding:12,crossAxis:true}),arrow({element:tip.current!,padding:24})]}).then(({x,y,placement,middlewareData})=>{
    if(cancelled)return;floating.style.left=x+'px';floating.style.top=y+'px';floating.style.visibility='visible';floating.dataset.side=placement.split('-')[0];
    const point=middlewareData.arrow;if(point&&tip.current){tip.current.style.left=point.x===undefined?'':point.x+'px';tip.current.style.top=point.y===undefined?'':point.y+'px';}
   });
  };
  const cleanup=autoUpdate(reference,floating,update,{animationFrame:true});
  return()=>{cancelled=true;cleanup();reference.removeAttribute('aria-expanded');reference.removeAttribute('aria-controls');};
 },[key,visible,host,id]);
 if(!token||!visible)return null;
 const logo=logoUrl(token.logo),chain=token.chain==='robinhood'?'Robinhood':token.chain==='bsc'?'BSC':'Solana';
 const activity=tokenActivity(token),window=activity?.window;
 const metric=(field:'liquidity'|'volume'|'buys'|'sells'|'swaps',short=false)=>{const n=activity?.[field];return n==null?'—':short&&n>=1000?compact.format(n):precise.format(n);};
 const metrics: Array<['liquidity'|'volume'|'buys'|'sells'|'swaps',string]>=activity?.buys!=null&&activity?.sells!=null?[['liquidity','Liquidity'],['volume','Volume'],['buys','Buys'],['sells','Sells']]:[['liquidity','Liquidity'],['volume','Volume'],['swaps','Trades']];
 const accent=tokenAppearance(token).color;
 return <aside ref={card} id={id} className="token-hover" role="dialog" aria-label={'Token '+token.name} data-trace-open={links.length>0} data-closing={closing} data-pinned={!!selected} style={{'--token-accent':accent} as CSSProperties} onPointerEnter={clearClose} onPointerLeave={leave} onFocus={clearClose} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))leave();}}>
  <span ref={tip} className="token-hover-arrow"/>
  <div className="token-hover-surface">
   <header><div className="token-hover-logo">{token.name.slice(0,2)}{logo&&<img src={logo} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>}</div>
    <div className="token-hover-identity"><small><img src={chainMark(token.chain)} alt=""/>{chain}</small><h2>{token.name}</h2></div>
    <div className="token-hover-actions"><button aria-label={selected?'Unpin token card':'Pin token card'} aria-pressed={!!selected} onClick={()=>{clearClose();setHovered(key);onSelectedChange(selected?null:key);}}><Glyph kind="pin"/></button><button aria-label="Close token card" onClick={close}><Glyph kind="close"/></button></div>
   </header>
   <TokenSocials tokens={tokenSnapshots(token,capture)}/>
   <div className="token-hover-primary"><div><span>MARKET CAP</span><AnimatedMarketCap key={key} value={numericField(token,'market_cap')}/></div></div>
   <dl className="token-hover-metrics">{metrics.map(([field,label])=><div key={field} data-metric={field}><dt>{label}</dt><dd title={metric(field)}>{metric(field,true)}</dd></div>)}</dl>
   <footer><button className="token-hover-address" title={token.id} aria-label="Copy token address" onClick={()=>{void navigator.clipboard.writeText(token.id).then(()=>setCopied(true)).catch(()=>setCopied(false));}}><span>{copied?'Copied':token.id.slice(0,6)+'…'+token.id.slice(-4)}</span><Glyph kind="copy"/></button><span className="token-hover-window">{window?window+' window':'Captured data'}</span></footer>
  </div>
  {links.length>0&&<TokenTracePanel links={links} onClose={()=>onCloseTrace?.()}/>}
 </aside>;
}
