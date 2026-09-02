import type {Capture,Field,PresentationCycle} from './AgentTradingJev';
export type BrainPacket={id:string;captureId:string;captureHash:string;receivedAt?:string;tokenKey:string;tokenName:string;chain:string;zone:string;count:number;changed:number;visible:boolean;fieldIds:string[];examples:{key:string;label:string;value:string|number|boolean;path:string}[];fields:Field[]};
export type BrainDatum={cycleId?:string;cycleAt?:string;id:string;tokenKey:string;tokenName:string;chain:string;captureId:string;captureHash:string;receivedAt?:string;endpoint?:string;field:Field;zone:string;window?:string;initial:boolean;changed:boolean};
export type BrainRoute={presentation?:PresentationCycle;paced?:boolean;packets:BrainPacket[];rows:BrainDatum[];observations:number;visibleObservations:number;otherObservations:number;captures:number;unverified:number};
export function routeCapturedData(previous:Capture|undefined,next:Capture|undefined,visibleKeys:string[]):BrainRoute;
