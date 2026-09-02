import type {BrainInspection} from './attractor-universe';

export function BrainDetails({value,onClose}:{value:BrainInspection;onClose:()=>void}){
 const title=value.zone?value.zone[0].toUpperCase()+value.zone.slice(1):'Data flow';
 const item=value.latest;
 return <aside className="attractor-detail brain-detail" aria-label="Brain routing details">
  <button aria-label="Close brain details" onClick={onClose}>×</button>
  <small>CAPTURE → PARAMETER → TOKEN</small><h1>{title}</h1>
  <p><span>Received fields</span><strong>{value.received.toLocaleString()}</strong></p>
  <p><span>For visible tokens</span><strong>{value.visible.toLocaleString()}</strong></p>
  <p><span>Other tracked tokens</span><strong>{value.other.toLocaleString()}</strong></p>
  {value.zoneCount!==null&&<p><span>In this region</span><strong>{value.zoneCount.toLocaleString()}</strong></p>}
  {value.unverified>0&&<p><span>Held · missing source evidence</span><strong>{value.unverified.toLocaleString()}</strong></p>}
  {item&&<>
   <small>{value.activeRoute?'Current route example':'Latest received example'} · {item.chain}</small><h2>{item.tokenName}</h2>
   <p title={item.field.path}><span>{item.field.key}</span><strong>{String(item.field.value)}</strong></p>
   <code>{item.tokenKey}</code><small>Received {item.receivedAt}</small>
   <details><summary>Source evidence</summary><code>{item.captureId}<br/>{item.captureHash}</code>
    <code className="brain-evidence-path">{item.field.path}</code><code>{item.id}</code>
   </details>
  </>}
  <p><span>Organisms in the scene</span><strong>{value.retained.toLocaleString()}</strong></p>
  <p><span>Previously routed</span><strong>{value.retired.toLocaleString()}</strong></p>
  <small>Counts at opening. All fields received by this preview are accounted for. One observed field is one cloud, from entry to its token. Aggregate values are not individual trades. The visible window retains up to 16,384 organisms; completed journeys make room for new fields. Regions follow the parameter catalog. JEV inference and order execution are not connected.</small>
 </aside>;
}

