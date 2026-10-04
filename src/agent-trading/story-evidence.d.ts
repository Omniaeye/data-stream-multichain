import type {Token} from './AgentTradingJev';
import type {NewsLink} from './useNewsSnapshot';
export function storyEvidence(link:NewsLink,tokens:Token[]):NewsLink['evidence'];

export function storiesWithEvidence(links:NewsLink[],tokens:Token[]):NewsLink[];
export function tokenStoryLinks(links:NewsLink[],tokens:Token[],key:string,origin?:NewsLink|null,now?:number):NewsLink[];
