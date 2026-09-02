import {ArrivalPaths,useOrganismArrivals} from './OrganismArrivals';
import {useId,useMemo,useState} from 'react';
import type {Token} from './AgentTradingJev';
import {observeToken} from './token-observation';
import {formatParameter,parameterFor} from './parameter-catalog';
import {logoUrl} from './market-activity';
import './token-organism.css';

const zones=[{id:'market',name:'Market',color:'#83ead0'},{id:'distribution',name:'Holders',color:'#a2bfff'},{id:'risk',name:'Risk',color:'#ebc688'},{id:'identity',name:'Identity',color:'#c0a9ef'},{id:'social',name:'Social',color:'#88cddd'}];
export function TokenOrganism({token,onField}:{token?:Token;onField:(key:string)=>void}){
 const uid=useId().replaceAll(':',''),[zone,setZone]=useState('market'),[key,setKey]=useState('price'),[failedLogo,setFailedLogo]=useState('');
 const observation=useMemo(()=>{try{return token?.observationMetadata?observeToken(token,token.observationMetadata):null;}catch{return null;}},[token]);
 const arrivals=useOrganismArrivals(observation);
 const fields=observation?.fields??[],present=fields.filter(f=>f.status==='present').length,selected=fields.find(f=>f.key===key),image=logoUrl(token?.logo);
 const choose=(key:string,zone:string)=>{setKey(key);setZone(zone);onField(key);};
 return <section className="organism" aria-label="Selected token organism">
  <header><div><small>TOKEN ANATOMY</small><h2>{token?.name??'Select a token'}</h2></div><span>{present} / 80 fields received</span></header>
  <div className="organism-arrival-controls"><button aria-pressed={arrivals.paused} onClick={()=>arrivals.setPaused(!arrivals.paused)}>{arrivals.paused?'Resume arrivals':'Pause arrivals'}</button><span>{arrivals.received} fields received since selection · {arrivals.pending} queued batches{arrivals.omitted?` · ${arrivals.omitted} fields omitted from animation`:''}{arrivals.reduced?' · Reduced motion':''}</span><small>Each pulse groups fields from one capture. It is not a trade.</small></div>
  {!observation?<p className="organism-unavailable">Waiting for source metadata. The existing inspector remains available below.</p>:<div className="organism-body">
   <div className="organism-visual"><svg viewBox="0 0 600 540" role="group" aria-label={`${token?.name} parameter regions; one point per catalog field`}>
    <defs><radialGradient id={uid+'glow'}><stop stopColor="#52ba9c" stopOpacity=".15"/><stop offset="1" stopColor="#52ba9c" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="300" cy="270" rx="244" ry="238" fill={`url(#${uid}glow)`}/>
    <path d="M300 56 C358 24 418 85 445 119 C499 137 551 207 510 263 C548 335 485 393 429 409 C397 484 320 507 270 467 C202 499 126 451 125 397 C55 370 51 295 83 251 C44 185 99 116 155 116 C187 48 250 26 300 56Z" fill="#102b2522" stroke="#71c4ac55" strokeWidth="1.5"/>
    {zones.map((z,i)=>{const a=-Math.PI/2+i*Math.PI*2/5,x=300+Math.cos(a)*159,y=270+Math.sin(a)*159,items=fields.filter(f=>f.zone===z.id);return <g key={z.id}>
     <path d={`M300 270 Q${300+Math.cos(a+.25)*80} ${270+Math.sin(a+.25)*80} ${x} ${y}`} stroke={z.color} strokeOpacity=".16" fill="none"/>
     <ellipse cx={x} cy={y} rx="61" ry="52" fill={z.color} fillOpacity={zone===z.id?'0.06':'0.04'} stroke={z.color} strokeOpacity={zone===z.id?'0.65':'0.2'}/>
     {items.map((f,j)=>{const angle=j*2.39996,r=11+Math.sqrt(j)*8;return <circle key={f.key} role="button" tabIndex={0} aria-label={`Inspect ${parameterFor(f.key)?.label}`} onClick={()=>choose(f.key,f.zone)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(f.key,f.zone);}}} cx={x+Math.cos(angle)*r} cy={y+Math.sin(angle)*r} r={key===f.key?5:3} fill={f.status==='present'?z.color:'#132622'} stroke={z.color} strokeOpacity={f.status==='present'?'.7':'.2'}><title>{parameterFor(f.key)?.label}: {f.status==='present'?String(f.raw):'Not supplied'}</title></circle>;})}
     <text x={x} y={y+70} fill={z.color} textAnchor="middle">{z.name}</text>
    </g>;})}
    {arrivals.moving&&<ArrivalPaths batches={arrivals.active}/>}
   </svg><div className="organism-nucleus">{image&&failedLogo!==image?<img src={image} alt={token?.name??''} onError={()=>setFailedLogo(image)}/>:<span>{token?.name.slice(0,3)}</span>}</div><p>Filled point: received field · Outline: missing field</p></div>
   <div className="organism-detail"><nav aria-label="Organism regions">{zones.map(z=><button key={z.id} aria-pressed={zone===z.id} onClick={()=>setZone(z.id)}>{z.name}<small>{fields.filter(f=>f.zone===z.id&&f.status==='present').length}</small></button>)}</nav>
    <div className="organism-fields">{fields.filter(f=>f.zone===zone).map(f=><button key={f.key} aria-pressed={key===f.key} onClick={()=>choose(f.key,f.zone)}><span>{parameterFor(f.key)?.label}</span><strong>{f.status==='present'?formatParameter({key:f.key,value:f.raw!}):'Not supplied'}</strong></button>)}</div>
    {selected&&<div className="organism-proof"><strong>{parameterFor(selected.key)?.label}</strong><p>{selected.status==='present'?`${selected.unit}${selected.window?' · '+selected.window+' window':''}`:'Not supplied in this capture'}</p><small>{selected.semanticStatus==='documented'?'Source-documented unit. Reported value; no independent verification.':parameterFor(selected.key)?.note}</small><details><summary>Source evidence</summary><code>Raw: {String(selected.raw)}</code><code>Received: {observation.receivedAt}</code>{selected.eventTime&&<code>Source event: {selected.eventTime}</code>}<code>{selected.evidence?.path??'No field evidence'}</code><code>Capture: {observation.captureId}</code><code>SHA-256: {selected.evidence?.captureHash}</code></details></div>}
   </div>
  </div>}
 </section>;
}
