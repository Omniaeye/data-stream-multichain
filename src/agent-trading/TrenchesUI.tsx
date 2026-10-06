import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {autoUpdate,computePosition,flip,offset,shift} from '@floating-ui/dom';
import type {Token} from './AgentTradingJev';
import {canonicalChain,numericField} from './token-selection';
import {chainMark} from './network-marks';
import {logoUrl} from './market-activity';
import {compactCap,tokenSocials} from './token-details';
import {tokenActivity} from './token-eligibility';
import {discoveryTime,launchTime} from './trenches-model';
import {money} from './trenches-policy';
import {TrenchesLaunchpad} from './TrenchesLaunchpad';
import {PlatformIcon} from '../components/PlatformIcon';

export const networkNames:Record<string,string>={solana:'Solana',bsc:'BSC',robinhood:'Robinhood'};
export const chainName=(chain:string)=>networkNames[canonicalChain(chain)??chain]??chain;
export const mark=(chain:string)=>chainMark(canonicalChain(chain)??chain);
export function age(token:Token,now:number){const at=launchTime(token)||discoveryTime(token);if(!at)return '—';const seconds=Math.max(0,(now-at)/1000);return (!launchTime(token)?'Seen ':'')+(seconds<60?Math.floor(seconds)+'s':seconds<3600?Math.floor(seconds/60)+'m':Math.floor(seconds/3600)+'h');}
export const shortAddress=(id:string)=>id.length>20?id.slice(0,6)+'…'+id.slice(-5):id;

type IconName='close'|'pin'|'star'|'search'|'filter'|'sliders'|'more'|'arrow'|'copy'|'check'|'compare'|'chevron'|'back'|'block'|'layout';
export function Icon({name}:{name:IconName}){const paths:Record<IconName,ReactNode>={
 close:<path d="m6 6 12 12M18 6 6 18"/>,pin:<><path d="m9 3 6 0-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v6"/></>,
 star:<path d="m12 3 2.7 5.6 6.2.9-4.5 4.4 1.1 6.1-5.5-2.9-5.5 2.9 1.1-6.1L3.1 9.5l6.2-.9L12 3Z"/>,
 search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,filter:<path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>,
 sliders:<><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6M16 9v6M10 15v6"/></>,more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
 arrow:<path d="M6 18 18 6M7 6h11v11"/>,copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/></>,check:<path d="m5 12 4 4L19 6"/>,compare:<><rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/></>,chevron:<path d="m8 10 4 4 4-4"/>,back:<path d="m14 5-7 7 7 7M7 12h13"/>,block:<><circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/></>,layout:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M14 9v11"/></>
 };return <svg className="tr-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;}

export function Logo({token}:{token:Token}){const src=logoUrl(token.logo);return <span className="tr-logo"><span>{token.name.slice(0,2)}</span>{src&&<img key={src} src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>}<TrenchesLaunchpad token={token}/></span>;}
export function LiveValue({value}:{value:string}){const previous=useRef(value),[changed,setChanged]=useState(false);useEffect(()=>{if(previous.current===value)return;previous.current=value;setChanged(true);const id=setTimeout(()=>setChanged(false),850);return()=>clearTimeout(id);},[value]);return <span className="tr-live-value" data-changed={changed}>{value}</span>;}
export function CopyAddress({id}:{id:string}){const [state,setState]=useState('');useEffect(()=>{setState('');},[id]);return <button className="tr-address" aria-label={'Copy contract '+id} onClick={()=>void navigator.clipboard.writeText(id).then(()=>setState('Copied')).catch(()=>setState('Copy unavailable'))}><Icon name={state==='Copied'?'check':'copy'}/><span>{state||shortAddress(id)}</span></button>;}
export function Stats({token}:{token:Token}){const activity=tokenActivity(token);const rows=[['Liquidity',money(numericField(token,'liquidity'))],['Vol '+(activity?.window.startsWith('24h')?'24h':activity?.window??'—'),money(activity?.volume)],['Holders',compactCap(numericField(token,'holder_count'))],['Buys / sells',compactCap(activity?.buys)+' / '+compactCap(activity?.sells)]];return <div className="tr-stats">{rows.map(([label,value])=><span key={label}><small>{label}</small><b><LiveValue value={value}/></b></span>)}</div>;}
export function SocialLinks({token}:{token:Token}){return <div className="tr-socials" aria-label="Token social links">{tokenSocials([token]).map(link=>{const u=new URL(link.url),parts=u.pathname.split('/').filter(Boolean);const label=link.platform==='web'?u.hostname.replace(/^www\./,''):link.platform==='x'?(parts[0]&&parts[0]!=='i'?'@'+parts[0]:'X post'):link.label;return <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={'Open '+link.label+': '+link.url}><PlatformIcon platform={link.platform} size={15}/><span>{label}</span><Icon name="arrow"/></a>;})}</div>;}

/** Menus escape scroll clipping but stay in the local workspace theme. */
export function Actions({label,children}:{label:string;children:ReactNode}){
 const ref=useRef<HTMLDetailsElement>(null),menu=useRef<HTMLDivElement>(null),[open,setOpen]=useState(false);
 function close(focus=false){if(ref.current)ref.current.open=false;setOpen(false);if(focus)ref.current?.querySelector('summary')?.focus();}
 useEffect(()=>{if(!open)return;const anchor=ref.current?.querySelector('summary'),floating=menu.current;if(!anchor||!floating)return;
  const cleanup=autoUpdate(anchor,floating,()=>{void computePosition(anchor,floating,{strategy:'fixed',placement:'bottom-end',middleware:[offset(6),flip({padding:12}),shift({padding:12})]}).then(({x,y})=>Object.assign(floating.style,{left:x+'px',top:y+'px',visibility:'visible'}));});
  const click=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))close();};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}};
  document.addEventListener('pointerdown',click);document.addEventListener('keydown',key,true);
  return()=>{cleanup();document.removeEventListener('pointerdown',click);document.removeEventListener('keydown',key,true);};
 },[open]);
 const target=document.querySelector('.tr-workspace');
 return <details className="tr-actions" ref={ref} onToggle={e=>setOpen(e.currentTarget.open)}><summary aria-label={label} onKeyDown={e=>{if(e.key==='Tab'&&!e.shiftKey&&open){const first=menu.current?.querySelector<HTMLElement>('button,a');if(first){e.preventDefault();first.focus();}}}}><Icon name="more"/></summary>{open&&target&&createPortal(<div ref={menu} className="tr-action-menu tr-floating-menu" aria-label={label} style={{visibility:'hidden'}} onPointerEnter={e=>e.stopPropagation()} onClick={()=>close(true)} onKeyDown={e=>{const items=[...e.currentTarget.querySelectorAll<HTMLElement>('button,a')],i=items.indexOf(document.activeElement as HTMLElement);if(e.key==='Tab'&&(e.shiftKey&&i===0||!e.shiftKey&&i===items.length-1)){e.preventDefault();close(true);}}}>{children}</div>,target)}</details>;
}

export function Splitter({width,onResize}:{width:number;onResize:(n:number)=>void}){const drag=useRef<{x:number;width:number}|null>(null);return <div className="tr-splitter" role="separator" aria-label="Resize details panel" aria-orientation="vertical" aria-valuemin={360} aria-valuemax={820} aria-valuenow={Math.round(width)} tabIndex={0} onDoubleClick={()=>onResize(560)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();onResize(e.key==='Home'?360:e.key==='End'?820:width+(e.key==='ArrowLeft'?24:-24));}}} onPointerDown={e=>{drag.current={x:e.clientX,width};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)onResize(drag.current.width+drag.current.x-e.clientX);}} onPointerUp={e=>{drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}} onLostPointerCapture={()=>drag.current=null}><i/></div>;}
