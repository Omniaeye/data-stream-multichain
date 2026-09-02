import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {Capture,GlobalFieldStats} from './AgentTradingJev';
import type {BrainDatum} from './brain-routing';
import {groupSummary,type GroupedStream,type FieldGroup} from './field-families';
import {StreamMetrics} from './StreamMetrics';
import {chainMark} from './network-marks';
import {ObservatoryEye} from './ObservatoryEye';
import {SceneIcon} from './SceneIcon';
const ROW_HEIGHT=38;
const chainLabel=(chain:string)=>({robinhood:'Robinhood Chain',bsc:'BSC',solana:'Solana'}[chain]??chain);
const clock=(time?:string)=>time&&Number.isFinite(Date.parse(time))?new Date(time).toISOString().slice(11,23):'—';
const integer=(n:number)=>n.toLocaleString('en-US');

export function DataStream({open=false,onClose,value,globalStats,sources,presentation,connectionError,onSelectDatum}:{open?:boolean;onClose?:()=>void;value:GroupedStream;globalStats?:GlobalFieldStats;sources?:Capture['sources'];presentation?:Capture['presentation'];connectionError:boolean;onSelectDatum:(datum:BrainDatum|null)=>void}){
 const rail=useRef<HTMLElement>(null),viewport=useRef<HTMLDivElement>(null),[top,setTop]=useState(0),[height,setHeight]=useState(400),[selected,setSelected]=useState<FieldGroup|null>(null),[datum,setDatum]=useState<BrainDatum|null>(null);
 const [held,setHeld]=useState<GroupedStream|null>(null),shown=held??value;
 useEffect(()=>{const node=viewport.current;if(!node)return;const observer=new ResizeObserver(()=>setHeight(node.clientHeight));observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  if(!open||!matchMedia('(max-width:1100px)').matches)return;
  const opener=document.activeElement as HTMLElement|null,node=rail.current;
  node?.querySelector<HTMLButtonElement>('.stream-close')?.focus();
  const trap=(event:KeyboardEvent)=>{
   if(event.key!=='Tab'||!node)return;
   const buttons=[...node.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
   const first=buttons[0],last=buttons.at(-1);if(!first||!last)return;
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);opener?.focus();};
 },[open]);
 const resume=()=>{setHeld(null);setSelected(null);setDatum(null);onSelectDatum(null);setTop(0);if(viewport.current)viewport.current.scrollTop=0;};
 useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape')resume();};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);});
 const inspect=(group:FieldGroup,row:BrainDatum=group.rows[0])=>{setHeld(current=>current??value);setSelected(group);setDatum(row);onSelectDatum(row);};
 const start=Math.max(0,Math.floor(top/ROW_HEIGHT)-3),end=Math.min(shown.rows.length,start+Math.ceil(height/ROW_HEIGHT)+6);
 return <aside ref={rail} role={open?"dialog":"complementary"} aria-modal={open||undefined} className="data-stream" id="incoming-data-stream" data-open={open} aria-label="Incoming data points" onPointerEnter={e=>{if(e.pointerType==='mouse')setHeld(current=>current??value);}} onPointerLeave={e=>{if(e.pointerType==='mouse')resume();}} onFocusCapture={()=>setHeld(current=>current??value)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))resume();}}>
  <header className="stream-header"><ObservatoryEye/><div className="stream-heading"><h2>Data stream</h2><span><i className={connectionError?'stream-dot interrupted':'stream-dot'}/>{connectionError?'Reconnecting':'Live captures'}</span></div><button className="stream-follow" onClick={resume} aria-label="Follow incoming data" title="Return to the latest captured data">{held?'Follow ↗':'LIVE'}</button><button className="stream-close" aria-label="Close data stream" onClick={onClose}><SceneIcon kind="close"/></button></header>
  <StreamMetrics stats={globalStats} sources={sources} total={value.total} byChain={value.byChain} connectionError={connectionError}/>
  <div className="stream-caption">{connectionError?'Connection interrupted':held?'Inspecting · collection continues':'Stream time · UTC'}<span>{clock(value.latest)}</span></div>
  {presentation&&<div className="stream-cycle" data-cycle={presentation.cycleId} data-status={presentation.status} title={'Cycle '+presentation.startedAt+' · Released '+presentation.publishedAt+(presentation.missing.length?' · Missing: '+presentation.missing.join(', '):'')}><span>{presentation.late?'Late arrival':'15s cycle'} · {clock(presentation.startedAt).slice(0,8)}</span><span>{presentation.sourceCount}/{presentation.expectedSources} sources{presentation.status==='partial'?' · incomplete':''}</span></div>}
  <div className="stream-list" ref={viewport} onScroll={event=>{if(!held&&event.currentTarget.scrollTop>2)setHeld(value);setTop(event.currentTarget.scrollTop);}} role="log" aria-live="off" aria-label="Parameter families with original fields" data-retained={shown.rows.length} data-total={value.total} data-frozen={!!held}>
   <div style={{height:shown.rows.length*ROW_HEIGHT,position:'relative'}}>
    {shown.rows.slice(start,end).map((row,index)=><button key={row.id} className="stream-row grouped" style={{position:'absolute',top:(start+index)*ROW_HEIGHT,height:ROW_HEIGHT,'--family-color':row.family.color} as CSSProperties} onClick={()=>inspect(row)} data-group-id={row.id} title={row.tokenName+' · '+row.family.label+' · '+row.rows.map(r=>r.field.key+': '+r.field.value).join(' | ')+' · Captured '+row.receivedAt}>
     <time title={'Presented '+row.presentedAt+' · Captured '+row.receivedAt}>{clock(row.presentedAt)}</time><img src={chainMark(row.chain)} alt={chainLabel(row.chain)}/><b>{row.tokenName}</b><span className="family-tag">{row.family.label}</span><strong>{groupSummary(row)}</strong>
    </button>)}
   </div>
   {!shown.rows.length&&<p className="stream-empty">Waiting for a verified capture.</p>}
  </div>
  <footer><span>{integer(value.total)} fields presented</span><span>Hover to inspect</span></footer>
  {selected&&<div className="stream-inspector" aria-label="Data point evidence"><button aria-label="Close data point" onClick={resume}>×</button><small>{chainLabel(selected.chain)} · Captured {clock(selected.receivedAt)} UTC</small><small>Presented {clock(selected.presentedAt)} UTC · Cycle {clock(selected.rows[0].cycleAt).slice(0,8)}</small><h3>{selected.tokenName}</h3><p style={{color:selected.family.color}}>{selected.family.label} · {selected.rows.length} fields</p><div className="group-fields">{selected.rows.map(row=><button key={row.id} aria-pressed={row.id===datum?.id} onClick={()=>inspect(selected,row)}><span>{row.field.key}</span><strong>{String(row.field.value)}</strong></button>)}</div>{datum&&<><code>{datum.tokenKey}</code><small>Source path</small><code>{datum.field.path}</code><code>{datum.captureId}</code><code>{datum.captureHash}</code></>}</div>}
 </aside>;
}


