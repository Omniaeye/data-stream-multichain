import {useEffect,useRef,useState} from 'react';
import type {Token} from './AgentTradingJev';
import type {NewsLink} from './useNewsSnapshot';
import {numericField,tokenKey} from './token-selection';
import {tokenActivity} from './token-eligibility';
import {compactCap,tokenSocials} from './token-details';
import {money,type Block} from './trenches-policy';
import {TokenBlockActions} from './TrenchesBlockActions';
import {TrenchesPost} from './TrenchesPost';
import {CopyAddress,Icon,LiveValue,Logo,SocialLinks,Stats,age,chainName,mark,shortAddress} from './TrenchesUI';
import {websitePreviews} from './trenches-previews';

export type Inspection={token:Token;links:NewsLink[];pinned:boolean};
type Props={inspection:Inspection;token:Token;links:NewsLink[];peers:Token[];candidates:Token[];blocks:Block[];now:number;watched:boolean;onWatch:()=>void;onClose:()=>void;onPin:()=>void;onSelect:(t:Token)=>void;onBlock:(b:Block)=>void;onKeyword:()=>void;onEnter:()=>void;onLeave:()=>void};
function Comparison({token,other,onClear}:{token:Token;other:Token;onClear:()=>void}){
 const metrics=(t:Token)=>{const a=tokenActivity(t);return [money(numericField(t,'market_cap')),money(numericField(t,'liquidity')),money(a?.volume)+(a?' · '+a.window:''),compactCap(numericField(t,'holder_count')),compactCap(a?.buys)+' / '+compactCap(a?.sells)];},left=metrics(token),right=metrics(other);
 return <section className="tr-comparison" aria-label="Contract comparison"><header><h3>Compare contracts</h3><button className="tr-icon-button" aria-label="Close comparison" onClick={onClear}><Icon name="close"/></button></header><div className="tr-compare-identities">{[token,other].map(t=><div key={tokenKey(t)}><Logo token={t}/><strong>{t.name}</strong><small><img src={mark(t.chain)} alt=""/>{chainName(t.chain)} · {shortAddress(t.id)}</small></div>)}</div><table><tbody>{['Market cap','Liquidity','Volume / window','Holders','Buys / sells'].map((label,i)=><tr key={label}><th>{label}</th><td>{left[i]}</td><td>{right[i]}</td></tr>)}</tbody></table></section>;
}
export function TrenchesInspector({inspection,token,links,peers,candidates,blocks,now,watched,onWatch,onClose,onPin,onSelect,onBlock,onKeyword,onEnter,onLeave}:Props){
 const scroll=useRef<HTMLDivElement>(null),[compare,setCompare]=useState(false),[otherKey,setOtherKey]=useState(''),[compact,setCompact]=useState(false);
 useEffect(()=>{scroll.current?.scrollTo({top:0});setOtherKey('');setCompare(false);setCompact(false);},[token.id,token.chain]);
 const other=candidates.find(t=>tokenKey(t)===otherKey&&tokenKey(t)!==tokenKey(token));
 const site=tokenSocials([token]).find(s=>websitePreviews[s.url]),preview=site&&websitePreviews[site.url];
 return <aside className="tr-inspector" role="dialog" aria-label={'Inspect '+token.name} data-token-key={tokenKey(token)} data-pinned={inspection.pinned} onPointerEnter={onEnter} onPointerLeave={onLeave}>
  <header className="tr-inspector-bar"><div className="tr-trace-caption">{compact?<><Logo token={token}/><span>{token.name}</span></>:<><span className="tr-trace-symbol">◉</span><span>Token trace</span></>}</div><div><button className="tr-icon-button" data-tooltip={inspection.pinned?'Unpin':'Pin'} aria-pressed={inspection.pinned} aria-label={inspection.pinned?'Unpin inspection':'Pin inspection'} onClick={onPin}><Icon name="pin"/></button><button className="tr-icon-button" data-tooltip="Close · Esc" aria-label="Close inspection" onClick={onClose}><Icon name="close"/></button></div></header>
  <div ref={scroll} className="tr-inspector-scroll" onScroll={e=>setCompact(e.currentTarget.scrollTop>160)}>
   <section className="tr-inspector-token"><div className="tr-token-head"><Logo token={token}/><div><h2>{token.name}</h2><small><img src={mark(token.chain)} alt=""/>{chainName(token.chain)}<span>·</span>{age(token,now)}</small></div><div className="tr-token-cap"><strong><LiveValue value={money(numericField(token,'market_cap'))}/></strong><small>Market cap</small></div></div>
    <Stats token={token}/><SocialLinks token={token}/><div className="tr-token-actions"><CopyAddress id={token.id}/><span className="tr-action-space"/><button className="tr-icon-button" aria-label={watched?'Remove from watchlist':'Add to watchlist'} aria-pressed={watched} onClick={onWatch} data-tooltip={watched?'Watching':'Watch'}><Icon name="star"/></button><button className="tr-icon-button" aria-label="Compare contracts" aria-expanded={compare} onClick={()=>setCompare(!compare)} data-tooltip="Compare"><Icon name="compare"/></button><TokenBlockActions token={token} links={links} onBlock={onBlock} onKeyword={onKeyword}/></div>
    {compare&&<label className="tr-compare-picker">Compare with<select aria-label="Compare with token" value={otherKey} onChange={e=>setOtherKey(e.target.value)}><option value="">Choose a contract…</option>{candidates.filter(t=>tokenKey(t)!==tokenKey(token)).map(t=><option key={tokenKey(t)} value={tokenKey(t)}>{t.name} · {chainName(t.chain)} · {shortAddress(t.id)}</option>)}</select></label>}
   </section>
   {compare&&other&&<Comparison token={token} other={other} onClear={()=>{setCompare(false);setOtherKey('');}}/>}
   <section className="tr-full-trace"><div className="tr-section-heading"><h3>Source trail</h3><span>{links.length} {links.length===1?'post':'posts'}</span></div>{links.map(link=><TrenchesPost key={link.event.url} link={link} blocks={blocks} onBlock={onBlock} onKeyword={onKeyword}/>)}{!links.length&&<p className="tr-empty">No captured post for this token.</p>}{site&&preview&&<a className="tr-website-preview" href={site.url} target="_blank" rel="noopener noreferrer"><img src={preview.image} alt="Captured website" loading="lazy"/><span>{new URL(site.url).hostname}<small>Captured {new Date(preview.capturedAt).toLocaleTimeString('en-GB',{timeZone:'UTC'})} UTC <Icon name="arrow"/></small></span></a>}</section>
   {!!peers.length&&<section className="tr-peers"><div className="tr-section-heading"><h3>Same post</h3><span>{peers.length} contracts</span></div><div className="tr-peer-table"><div className="tr-peer-columns"><span>Token / network</span><span>Liquidity</span><span>MC</span></div>{peers.map(t=><button key={tokenKey(t)} aria-label={'Inspect peer '+t.name+' '+t.id} onClick={()=>onSelect(t)}><span className="tr-peer-name"><Logo token={t}/><span><strong>{t.name}</strong><small><img src={mark(t.chain)} alt=""/>{chainName(t.chain)} · {age(t,now)}</small></span></span><span>{money(numericField(t,'liquidity'))}</span><b>{money(numericField(t,'market_cap'))}</b></button>)}</div></section>}
   <details className="tr-details"><summary>Captured details <Icon name="chevron"/></summary><div className="tr-evidence-note">Last captured {token.evidence?.receivedAt?new Date(token.evidence.receivedAt).toLocaleTimeString('en-GB',{timeZone:'UTC'}):'—'} UTC</div><code>{token.id}</code><dl>{token.fields.map((f,i)=><div key={f.id??i}><dt>{f.key.replaceAll('_',' ')}</dt><dd>{String(f.value)}</dd></div>)}</dl></details>
  </div>
 </aside>;
}
