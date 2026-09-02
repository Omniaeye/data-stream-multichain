import {SocialPost} from './SocialPost';
import {SceneIcon} from './SceneIcon';
import type {NewsLink} from './useNewsSnapshot';
import './token-trace.css';

export function TokenTracePanel({links,onClose}:{links:NewsLink[];onClose:()=>void}){
 if(!links.length)return null;
 return <section className="token-trace" aria-label="Social trace">
  <header className="trace-heading"><div><span className="trace-status-dot"/>SOCIAL TRACE <small>{links.length}</small></div><button onClick={onClose} aria-label="Close trace"><SceneIcon kind="close"/></button></header>
  <div className="trace-scroll"><section className="trace-content" aria-label="Social posts">{links.map(({event,evidence})=><SocialPost key={event.url} event={event} basisUrl={evidence.every(e=>e.inferred)?evidence[0]?.basisUrl:undefined}/>)}</section></div>
 </section>;
}
