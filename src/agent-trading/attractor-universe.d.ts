import type {TradingEvent} from './trading-session';
import type {createTradingFeed} from './trading-feed';
import type {Token,Capture} from './AgentTradingJev';
import type {BrainRoute,BrainDatum} from './brain-routing';
export type BrainInspection={received:number;delivered:number;inFlight:number;pending:number;visible:number;other:number;changed:number;unverified:number;zone:string|null;zoneCount:number|null;activeRoute:boolean;latest:BrainDatum|null;retired:number;retained:number;resident:number};
export function createUniverse(host:HTMLElement,onSelect:(key:string)=>void,onError:()=>void,onBrainInspect:(zone:string|null,inspection:BrainInspection)=>void,trading?:{session:ReturnType<typeof createTradingFeed>;onEvent:(event:TradingEvent)=>void}):{setMode(view:string):void;setTracked(keys:string[]):void;setTokens(tokens:Token[]):void;setSelected(key:string|null):void;setCohort(keys:string[]):void;highlightTokens(keys:string[]):void;revealToken(key:string):void;setSources(sources:NonNullable<Capture['sources']>):void;ingest(route:BrainRoute):void;selectDatum(datum:BrainDatum|null):void;pause(value:boolean):void;resetView():void;dispose():void};
