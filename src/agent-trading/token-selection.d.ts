import type {Token} from './AgentTradingJev';
export type Chain='robinhood'|'bsc'|'solana';
export const CHAINS:{id:Chain;label:string}[];
export function canonicalChain(chain:string):Chain|null;
export function tokenKey(token:Token):string;
export function numericField(token:Token,key:string):number|null;
export function selectTokens(tokens:Token[],filters?:{chain?:Chain|'all';minMarketCap?:number;minLiquidity?:number}):{
 tokens:Token[];counts:Record<Chain,number>;networkCount:number;excludedCount:number;unknownMarketCap:number;unknownLiquidity:number;
};
