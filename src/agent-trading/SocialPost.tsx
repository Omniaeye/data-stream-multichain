import {PlatformIcon} from '../components/PlatformIcon';
import {RecordMedia} from '../components/RecordMedia';
import type {NewsLink} from './useNewsSnapshot';

function date(value:string|null){const n=Date.parse(value??'');return Number.isFinite(n)?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(n)+' UTC':'';}
export function SocialPost({event,compact=false,basisUrl}:{event:NewsLink['event'];compact?:boolean;basisUrl?:string}){
 return <article className="trace-post" data-compact={compact}>
  <header><span className="trace-author-avatar">{event.author?.avatar?<img src={event.author.avatar} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>:<PlatformIcon platform={event.platform} size={20}/>}</span><div><strong>{event.author?.name||event.sourceLabel}</strong><span>{event.author?.handle&&'@'+event.author.handle.replace(/^@/,'')}{event.author?.followers!=null&&' · '+new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(event.author.followers)+' followers'}</span></div><PlatformIcon platform={event.platform} size={14}/></header>
  <p>{event.body||event.title}</p>
  <RecordMedia record={{...event,media:compact?event.media?.slice(0,1):event.media}} url={event.sourceUrl??event.url}/>
  <footer><time dateTime={event.publishedAt??undefined}>{date(event.publishedAt)}</time><a href={event.sourceUrl??event.url} target="_blank" rel="noopener noreferrer">Open post ↗</a></footer>
  {basisUrl&&<a className="coverage-basis" href={basisUrl} target="_blank" rel="noopener noreferrer" title="Related by post content. This token captured another post covering the same topic; this is an inferred association.">Related coverage · captured post ↗</a>}
 </article>;
}
