import {numericField,tokenKey} from './token-selection.js';
import {storiesWithEvidence} from './story-evidence.js';

export function launchTime(token){
 const n=numericField(token,'creation_timestamp')??numericField(token,'created_timestamp')??token.ranking?.createdAt;
 return typeof n==='number'&&Number.isFinite(n)&&n>0?n*1000:null;
}
export function discoveryTime(token){const n=Date.parse(token.firstSeenAt??'');return Number.isFinite(n)?n:0;}
export function newestTokens(tokens){return [...tokens].sort((a,b)=>(launchTime(b)??discoveryTime(b))-(launchTime(a)??discoveryTime(a))||tokenKey(a).localeCompare(tokenKey(b)));}
export function retainTrenches(previous,current,limit=900){
 const map=new Map(previous.map(t=>[tokenKey(t),t]));
 for(const token of current){const old=map.get(tokenKey(token));map.set(tokenKey(token),{...token,firstSeenAt:old?.firstSeenAt??token.firstSeenAt});}
 return newestTokens([...map.values()]).slice(0,limit);
}
export function trenchesStories(links,tokens){
 const stories=storiesWithEvidence(links,tokens),byToken=new Map();
 for(const story of stories)for(const key of new Set(story.evidence.map(e=>e.tokenKey))){
  if(!byToken.has(key))byToken.set(key,[]);
  if(!byToken.get(key).some(s=>s.event.url===story.event.url))byToken.get(key).push({...story,evidence:story.evidence.filter(e=>e.tokenKey===key)});
 }
 for(const [key,items] of byToken)items.sort((a,b)=>Number(a.evidence.every(e=>e.inferred))-Number(b.evidence.every(e=>e.inferred))||Date.parse(b.event.publishedAt??b.event.cachedAt)-Date.parse(a.event.publishedAt??a.event.cachedAt));
 return {stories,byToken};
}
