import type {Token} from './AgentTradingJev';
export const TOKEN_NOTICE_MS:number;
export const TOKEN_NEW_MARK_MS:number;
export const TOKEN_HISTORY_KEY:string;
export type TokenArrival={id:number;tokens:Token[];detectedAt:number;expiresAt:number};
export function createTokenArrivals(options?:{storage?:Pick<Storage,'getItem'|'setItem'>;storageKey?:string;pendingMs?:number}):{ingest(tokens:Token[],visibleKeys:string[],now:number):TokenArrival|null};
