import type {Token} from './AgentTradingJev';
export function tokenDynamics(token?:Token,now?:number):{fresh:boolean;interval:string|null;volumeKnown:boolean;balanceKnown:boolean;balance:number|null;attraction:number;spin:number;reason:string};
