import type {Token} from './AgentTradingJev';
export type TradingEvent={id:string;positionId:string;reference:string;kind:'presentation'|'observed';subject:string;chain:string;action:string;multiple:number|null;status:'open'|'closed'|'skipped';openCount:number;at:number;elapsed:number;position:number[];life:number;token?:Token;entryCap?:number;currentCap?:number;entryAt?:number;peakMultiple?:number;sourceUrl?:string;sourceTitle?:string};
export const MAX_OPEN_POSITIONS:number;
export const TRADING_ROW_LIMIT:number;
export const TP_MULTIPLES:Readonly<Record<string,number>>;
export function mergeTradingRow(rows:TradingEvent[],event:TradingEvent):TradingEvent[];
export function createTradingSession(options?:{seed?:number;startedAt?:number}):{advance(time:number,now?:number):TradingEvent[];setExternalOpen(count:number):void;readonly time:number;readonly openCount:number};
