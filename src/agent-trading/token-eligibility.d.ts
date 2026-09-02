import type {Token} from './AgentTradingJev';
export const TOKEN_ACTIVITY_POLICY:Readonly<{introMs:number;introCap:number;matureCap:number;minLiquidity:number;minVolume:number;minSwaps:number;freshMs:number}>;
export type TokenActivity={window:string;receivedAt?:string;volume:number|null;swaps:number|null;liquidity:number|null;buys:number|null;sells:number|null};
export function firstFeedAge(token:Token,now?:number):number|null;
export function sourceAge(token:Token,now?:number):number|null;
export function tokenActivity(token:Token,now?:number):TokenActivity|null;
export function tokenEligibility(token:Token,now?:number):{eligible:boolean;reason:string|null;intro:boolean;activity:TokenActivity|null};
