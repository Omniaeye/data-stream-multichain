/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */
import {useLayoutEffect,useRef,useState} from 'react';
import type {TradingEvent} from './trading-session';
import {chainMark} from './network-marks';
import {ObservatoryEye} from './ObservatoryEye';
import {canonicalChain} from './token-selection';
import './trading-ledger.css';

const names:Record<string,string>={robinhood:'Robinhood',bsc:'BSC',solana:'Solana'};
const time=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const multiple=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

export function TradingLedger({rows,disconnected}:{rows:TradingEvent[];disconnected:boolean}){
 const scroll=useRef<HTMLDivElement>(null),anchor=useRef<{id:string;offset:number}|null>(null),last=useRef<string|null>(null);
 const [unread,setUnread]=useState(0);
 function remember(){
  const el=scroll.current;if(!el||el.scrollTop<8){anchor.current=null;setUnread(0);return;}
  const box=el.getBoundingClientRect();
  const first=[...el.querySelectorAll<HTMLElement>('[data-position-id]')].find(row=>row.getBoundingClientRect().bottom>box.top);
  anchor.current=first?{id:first.dataset.positionId!,offset:first.getBoundingClientRect().top-box.top}:null;
 }
 useLayoutEffect(()=>{
  const top=rows[0]?.id??null,el=scroll.current;
  if(top===last.current||!el)return;last.current=top;
  if(anchor.current){
   const target=[...el.querySelectorAll<HTMLElement>('[data-position-id]')].find(row=>row.dataset.positionId===anchor.current!.id);
   if(target)el.scrollTop+=target.getBoundingClientRect().top-el.getBoundingClientRect().top-anchor.current.offset;
   setUnread(n=>n+1);
  }else el.scrollTop=0;
 },[rows]);
 return <section className="jev-ledger" aria-label="JEV trading activity">
  <header><span className="jev-ledger-port" aria-hidden="true"/><h2>JEV TRADING</h2><span className="jev-ledger-beta">PREVIEW BETA</span>{disconnected&&<small role="status">Reconnecting</small>}<span className="jev-ledger-open"><i/>{rows.filter(row=>row.status==='open').length}/10 OPEN</span><small>{rows.length}/100</small></header>
  <div className="jev-ledger-columns" aria-hidden="true"><span>TIME</span><span>POSITION</span><span>CHAIN</span><span>ACTION</span><span>STATE</span><span>RESULT</span></div>
  <div className="jev-ledger-scroll" ref={scroll} onScroll={remember} tabIndex={0} aria-label="Last 100 trading positions">
   {!rows.length&&<div className="jev-ledger-wait"><i/>JEV <span>• • •</span></div>}
   {rows.map(row=>{
    const chain=canonicalChain(row.chain)??row.chain;
    return <div className="jev-ledger-case" key={row.positionId} data-position-id={row.positionId} data-event-id={row.id} data-kind={row.kind} data-status={row.status}>
     <div className="jev-ledger-row">
      <time dateTime={new Date(row.at).toISOString()} title={new Date(row.at).toLocaleString()}>{time.format(row.at)}</time>
      <div className="jev-ledger-identity">
       <ObservatoryEye/><span className="jev-ledger-secret">CONFIDENTIAL<small>#{row.reference}</small></span>
      </div>
      <span className="jev-ledger-chain" title={names[chain]??chain}><img src={chainMark(chain)} alt={names[chain]??chain}/><span>{chain==='robinhood'?'RH':chain==='solana'?'SOL':'BSC'}</span></span>
      <span className="jev-ledger-action" data-action={row.action} title={row.action}>{row.action==='HOLD MOONBAG'?'MOONBAG':row.action}</span>
      <span className="jev-ledger-status">{row.status==='skipped'?'—':row.status.toUpperCase()}</span>
      <span className="jev-ledger-result" data-gain={row.multiple!==null&&row.multiple>=1} title={row.status==='open'?'Open':row.status==='closed'?'Closed':'Skipped'}><i aria-label={row.status}/>{row.multiple===null?'—':multiple.format(row.multiple)+'×'}</span>
     </div>
    </div>;
   })}
  </div>
  {unread>0&&<button className="jev-ledger-unread" onClick={()=>{anchor.current=null;if(scroll.current)scroll.current.scrollTop=0;setUnread(0);}}>↑ {unread} updates</button>}
 </section>;
}
