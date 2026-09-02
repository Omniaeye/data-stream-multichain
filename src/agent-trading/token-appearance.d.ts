import type {Token} from './AgentTradingJev';
export const NETWORK_COLORS:Record<string,string>;
export function tokenAppearance(token:Token):{diameter:number;color:string;radius:number;knownCap:boolean};

export function capLabelColor(cap:number|null):string;
export function globalTokenDiameter(token:Token):number;
