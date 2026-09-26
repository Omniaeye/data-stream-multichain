import type {TradingEvent} from './trading-session';
export function createTradingFeed():{receive(snapshot:{sequence:number;rows:TradingEvent[];events:Array<TradingEvent&{sequence:number}>},now?:number):TradingEvent[]|null;advance():TradingEvent[];readonly sequence:number;readonly time:number};
