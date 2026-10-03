import {marketRoute} from './market-route';
import './market-navigation.css';

export function MarketNavigation({view,onView}:{view:string;onView?:(mode:'discovery'|'global')=>void}){
 return <div className="market-navigation" role="group" aria-label="Market views">{(['trenches','discovery','global'] as const).map(mode=>{
  const name=mode==='trenches'?'Trenches':mode==='discovery'?'Trending':'Global';
  if(onView&&mode!=='trenches')return <button key={mode} aria-pressed={view===mode} onClick={()=>{
   const url=new URL(location.href);if(mode==='global')url.searchParams.set('view','global');else url.searchParams.delete('view');
   history.replaceState(history.state,'',url);onView(mode);
  }}>{name}</button>;
  return <a key={mode} href={marketRoute(mode,location)} aria-current={view===mode?'page':undefined}>{name}</a>;
 })}</div>;
}
