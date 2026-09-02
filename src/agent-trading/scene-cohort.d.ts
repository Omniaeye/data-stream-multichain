import type {Token} from './AgentTradingJev';
export function sourceAge(token:Token,now?:number):number|null;
export function activeRanking(token:Token,now?:number):boolean;
export function sceneCohort(tokens:Token[],options?:{view?:string;hours?:number;minCap?:number;quality?:boolean;trackedKeys?:Set<string>;now?:number}):Token[];
