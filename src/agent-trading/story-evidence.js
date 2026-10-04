import {tokenNewsReferences,contentUrl} from './news-links.js';
import {trackedSocialKeys} from './social-trace.js';
export function storyEvidence(link,tokens,references=tokenNewsReferences(tokens)){
 const rows=new Map((link.evidence??[]).filter(ref=>ref.match!=='author_profile'&&ref.kind!=='profile'&&ref.captureId&&ref.captureHash).map(ref=>[ref.tokenKey,ref]));
 const url=contentUrl(link.event.url);
 for(const ref of references)if(ref.kind==='content'&&ref.url===url)rows.set(ref.tokenKey,{...ref,match:'post_url'});
 return [...rows.values()];
}

export function storiesWithEvidence(links,tokens){const refs=tokenNewsReferences(tokens);return links.map(link=>({...link,evidence:storyEvidence(link,tokens,refs)}));}

// Inspection shares the exact references used by the news chips. An explicitly
// opened source stays available even if it later leaves the recent-news feed.
export function tokenStoryLinks(links,tokens,key,origin=null,now=Date.now()){
 const ordered=origin?[origin,...links.filter(link=>link.event.url!==origin.event.url)]:links;
 return storiesWithEvidence(ordered,tokens).filter(link=>
  (origin&&link.event.url===origin.event.url&&link.evidence.some(ref=>ref.tokenKey===key))||trackedSocialKeys([link],now).has(key)
 ).map(link=>({...link,evidence:link.evidence.filter(ref=>ref.tokenKey===key)}));
}
