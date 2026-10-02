import type {Token} from './AgentTradingJev';
import {tokenLaunchpad} from './trenches-launchpad';
import pump from './trenches-assets/launchpads/pump.svg';
import stonkfun from './trenches-assets/launchpads/stonkfun.png';
import pons from './trenches-assets/launchpads/pons.png';
import flap from './trenches-assets/launchpads/flap.svg';
import fourmeme from './trenches-assets/launchpads/fourmeme.svg';
import meteora from './trenches-assets/launchpads/meteora.svg';
import bags from './trenches-assets/launchpads/bags.png';
import bankr from './trenches-assets/launchpads/bankr.svg';
import letsbonk from './trenches-assets/launchpads/letsbonk.png';
import raydium from './trenches-assets/launchpads/raydium.svg';
import stonkbroker from './trenches-assets/launchpads/stonkbroker.png';
import poolstrade from './trenches-assets/launchpads/poolstrade.svg';
import openfour from './trenches-assets/launchpads/openfour.svg';
import klik from './trenches-assets/launchpads/klik.png';
import pairfund from './trenches-assets/launchpads/pairfund.png';
import geniusfun from './trenches-assets/launchpads/geniusfun.svg';
import noxa from './trenches-assets/launchpads/noxa.png';
import lunch from './trenches-assets/launchpads/lunch.png';
import circus from './trenches-assets/launchpads/circus.svg';

export const launchpadMarks:Record<string,string>={pump,stonkfun,pons,flap,fourmeme,meteora,bags,bankr,letsbonk,raydium,stonkbroker,poolstrade,openfour,klik,pairfund,geniusfun,noxa,lunch,circus};
/** Always visible at the token's lower-right edge; independent of quick-action preferences. */
export function TrenchesLaunchpad({token}:{token:Token}){
 const platform=tokenLaunchpad(token);
 if(!platform)return null;
 const image=launchpadMarks[platform.id];
 return <span className="tr-launchpad" data-launchpad={platform.id} role="img" aria-label={'Launchpad: '+platform.label}>
  <span className="tr-launchpad-initial" aria-hidden="true">{platform.label.slice(0,2).toUpperCase()}</span>
  {image&&<img src={image} alt="" draggable={false} onError={e=>{e.currentTarget.hidden=true;}}/>}
  <span className="tr-launchpad-name" aria-hidden="true">{platform.label}</span>
 </span>;
}
