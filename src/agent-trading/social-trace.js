import {publicLink} from './token-details.js';
const socialPlatforms=new Set(['x','twitter','instagram','telegram','reddit','youtube','tiktok','facebook','threads','bluesky','linkedin','truthsocial','github']);
export function socialProfileUrl(value){
 const safe=publicLink(value);if(!safe)return null;
 const u=new URL(safe),host=u.hostname.toLowerCase().replace(/^www\./,'').replace(/^mobile\./,''),path=u.pathname.replace(/\/+$/,'');
 let match;
 if(['x.com','twitter.com'].includes(host)){
  match=path.match(/^\/([\w]{1,15})$/);if(!match||['home','explore','search','i','settings','intent','share'].includes(match[1].toLowerCase()))return null;
  return 'https://x.com/'+match[1].toLowerCase();
 }
 if(host==='instagram.com'&&(match=path.match(/^\/([\w.]+)$/))&&!['p','reel','reels','explore','accounts'].includes(match[1]))return 'https://instagram.com/'+match[1].toLowerCase();
 if(['t.me','telegram.me'].includes(host)&&(match=path.match(/^\/(?:s\/)?([\w]{5,32})$/)))return 'https://t.me/'+match[1].toLowerCase();
 if(['threads.net','threads.com'].includes(host)&&(match=path.match(/^\/@([\w.]+)$/)))return 'https://threads.com/@'+match[1].toLowerCase();
 if(['youtube.com','m.youtube.com'].includes(host)&&(match=path.match(/^\/(?:@[^/]+|channel\/[^/]+)$/)))return 'https://youtube.com'+match[0];
 if(['reddit.com','old.reddit.com'].includes(host)&&(match=path.match(/^\/(?:user|u)\/([\w-]+)$/)))return 'https://reddit.com/user/'+match[1].toLowerCase();
 if(host==='tiktok.com'&&(match=path.match(/^\/@([\w.]+)$/)))return 'https://tiktok.com/@'+match[1].toLowerCase();
 if(host==='bsky.app'&&/^\/profile\/[^/]+$/.test(path))return 'https://bsky.app'+path.toLowerCase();
 if(host==='github.com'&&/^\/[\w-]+$/.test(path))return 'https://github.com'+path.toLowerCase();
 if(host==='facebook.com'&&/^\/[\w.]+$/.test(path)&&!['/reel','/watch','/share','/login'].includes(path))return 'https://facebook.com'+path.toLowerCase();
 if(host==='linkedin.com'&&/^\/(?:in|company)\/[^/]+$/.test(path))return 'https://linkedin.com'+path.toLowerCase();
 if(host==='truthsocial.com'&&/^\/@[\w]+$/.test(path))return 'https://truthsocial.com'+path.toLowerCase();
 return null;
}
export function authorProfile(event){
 const account=event.socialMetadata?.account??event.author??{};
 const explicit=socialProfileUrl(account.canonicalProfileUrl??account.profileUrl??event.sourceProfileUrl);
 if(explicit)return explicit;
 const handle=String(account.handle??'').replace(/^@/,'');
 if(['x','twitter'].includes(event.platform)&&/^[\w]{1,15}$/.test(handle))return socialProfileUrl('https://x.com/'+handle);
 if(event.platform==='instagram'&&/^[\w.]+$/.test(handle))return socialProfileUrl('https://instagram.com/'+handle);
 return null;
}
export function trackedSocialKeys(links,now=Date.now()){
 const keys=new Set();
 for(const {event,evidence} of links??[]){const at=Date.parse(event.publishedAt);if(!socialPlatforms.has(event.platform)||!Number.isFinite(at)||at>now||now-at>10800000)continue;
  for(const ref of evidence??[])if(ref.captureId&&ref.captureHash)keys.add(ref.tokenKey);
 }
 return keys;
}
