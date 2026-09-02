import type {GlobalFieldStats} from './AgentTradingJev';
export function counterAt(stats?:GlobalFieldStats,now?:number):number;
export function networkCounterAt(stats:GlobalFieldStats,chain:string,now?:number):number;
export function totalCounterAt(stats:GlobalFieldStats,now?:number):number;
export function lastPresentedAt(stats:GlobalFieldStats,chain:string,now?:number):number|null;
export function elapsedLabel(ms:number):string;
