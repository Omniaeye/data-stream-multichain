import type {Token} from './AgentTradingJev';
import {PlatformIcon} from '../components/PlatformIcon';
import {tokenSocials} from './token-details';

function socialLabel(link:{url:string;platform:string;label:string}){
 const path=new URL(link.url).pathname.split('/').filter(Boolean);
 if(link.platform==='web')return link.url;
 if(link.platform==='x')return path.includes('status')?'Post · '+(path[0]==='i'?'X':'@'+path[0]):path[0]?'@'+path[0]:link.label;
 if(link.platform==='telegram')return path[0]?'t.me/'+path[0]:link.label;
 if(link.platform==='instagram')return path[0]==='p'||path[0]==='reel'?'Instagram post':path[0]?'@'+path[0]:link.label;
 if(link.platform==='reddit')return path[0]==='r'&&path[1]?'r/'+path[1]:link.label;
 return link.label;
}
export function TokenSocials({tokens}:{tokens:Token[]}){
 const links=tokenSocials(tokens);if(!links.length)return null;
 return <div className="token-socials" aria-label="Token social links">{links.map(link=><a key={link.url} className={link.platform==='web'?'token-social-site':undefined} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${link.label}: ${link.url}`} title={`${link.label} · ${new URL(link.url).hostname}\nFrom ${link.field}`}><PlatformIcon platform={link.platform} size={14}/><span>{socialLabel(link)}</span></a>)}</div>;
}
