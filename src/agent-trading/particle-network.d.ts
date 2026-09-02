import type {Token} from './AgentTradingJev';
export function createNetwork(host: HTMLElement,tokens: Token[],onSelect:(index:number)=>void,onError:()=>void):{pulse(keys:string[]):void;select(index:number):void;focus():void;resetView():void;setTokens(tokens:Token[]):void;setPlaying(value:boolean):void;dispose():void};
