import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {autoUpdate,computePosition,flip,offset,shift,size} from '@floating-ui/dom';
import {toggleLaunchpad,networkLaunchpads,type LaunchpadOption,type LaunchpadPreferences} from './trenches-launchpad';
import {launchpadMarks} from './TrenchesLaunchpad';
import {mark,chainName} from './TrenchesUI';
import type {Block} from './trenches-policy';
import './trenches-launchpad-filters.css';

export function TrenchesLaunchpadFilters({options,chain,prefs,blocks,onChange}:{options:LaunchpadOption[];chain:string;prefs:LaunchpadPreferences;blocks:Block[];onChange:(next:Record<string,string[]|null>,unblockKeys:string[])=>void}){
 const [open,setOpen]=useState(false),anchor=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),id=useId();
 const venues=options.filter(o=>o.chains.includes(chain)),selected=networkLaunchpads(prefs,chain),prefix='launchpad:'+chain+':';
 const blocked=new Set(blocks.filter(b=>b.scope!=='posts'&&b.key.startsWith(prefix)).map(b=>b.key.slice(prefix.length)));
 const filtered=selected!==null||blocked.size>0;
 function close(focus=false){setOpen(false);if(focus)anchor.current?.focus();}
 useEffect(()=>{if(!open||!anchor.current||!menu.current)return;const button=anchor.current,popup=menu.current;
  const cleanup=autoUpdate(button,popup,()=>{void computePosition(button,popup,{strategy:'fixed',placement:'bottom-start',middleware:[offset(8),flip({padding:12}),shift({padding:12}),size({padding:12,apply:({availableHeight})=>{popup.style.maxHeight=Math.max(0,Math.min(430,availableHeight))+'px';}})]}).then(({x,y})=>Object.assign(popup.style,{left:x+'px',top:y+'px',visibility:'visible'}));});
  popup.querySelector<HTMLElement>('button')?.focus();
  const outside=(e:PointerEvent)=>{if(!button.contains(e.target as Node)&&!popup.contains(e.target as Node))close();};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);
  return()=>{cleanup();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);};
 },[open]);
 function select(id:string){const wasBlocked=blocked.has(id),next=wasBlocked&&(selected===null||selected.includes(id))?selected:toggleLaunchpad(selected,id,venues);onChange({...prefs.launchpadsByChain,[chain]:next},wasBlocked?[prefix+id]:[]);}
 const target=document.querySelector('.tr-workspace');
 return <><button ref={anchor} type="button" className="tr-launchpads-trigger" aria-label={chainName(chain)+' launchpads'} aria-expanded={open} aria-controls={open?id:undefined} aria-haspopup="dialog" data-filtered={filtered} onClick={()=>setOpen(v=>!v)}>Launchpads<span aria-hidden="true">⌄</span></button>
  {open&&target&&createPortal(<div ref={menu} id={id} role="dialog" aria-label={chainName(chain)+' launchpads'} className="tr-launchpads-menu" style={{visibility:'hidden'}} onKeyDown={e=>{if(e.key==='Tab'){const nodes=[...e.currentTarget.querySelectorAll<HTMLElement>('button')],i=nodes.indexOf(document.activeElement as HTMLElement);if(e.shiftKey&&i===0||!e.shiftKey&&i===nodes.length-1){e.preventDefault();close(true);}}}}>
   <header><span><img src={mark(chain)} alt=""/>{chainName(chain)} launchpads</span><button aria-label="Close launchpads" onClick={()=>close(true)}>×</button></header>
   <div className="tr-launchpads-bulk"><button onClick={()=>onChange({...prefs.launchpadsByChain,[chain]:null},[...blocked].map(id=>prefix+id))}>Select all</button><button onClick={()=>onChange({...prefs.launchpadsByChain,[chain]:[]},[])}>Deselect all</button></div>
   <div className="tr-launchpads-options" role="group" aria-label="Platforms">{venues.map(option=>{const isBlocked=blocked.has(option.id),checked=!isBlocked&&(selected===null||selected.includes(option.id));return <button key={option.id} type="button" role="checkbox" aria-checked={checked} data-venue={option.id} title={isBlocked?'Unblock '+option.label:option.label} onClick={()=>select(option.id)}><span className="tr-launchpads-check" aria-hidden="true">{checked?'✓':''}</span>{launchpadMarks[option.mark]&&<img src={launchpadMarks[option.mark]} alt=""/>}<span>{option.label}</span>{isBlocked&&<small>Blocked</small>}</button>;})}</div>
  </div>,target)}
 </>;
}
