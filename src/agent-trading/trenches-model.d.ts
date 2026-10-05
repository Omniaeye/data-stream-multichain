import type {Token} from './AgentTradingJev';
import type {NewsLink} from './useNewsSnapshot';
export function launchTime(token:Token):number|null;
export function discoveryTime(token:Token):number;
export function newestTokens(tokens:Token[]):Token[];
export function retainTrenches(previous:Token[],current:Token[],limit?:number):Token[];
export function trenchesStories(links:NewsLink[],tokens:Token[]):{stories:NewsLink[];byToken:Map<string,NewsLink[]>};
