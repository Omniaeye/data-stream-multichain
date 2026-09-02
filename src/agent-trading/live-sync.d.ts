import type {Capture} from './AgentTradingJev';
export function revisionOf(capture:Capture):string;
export function applyEnvelope(current:Capture|undefined,message:unknown):Capture;
export function retryDelay(failures:number,random?:()=>number):number;
