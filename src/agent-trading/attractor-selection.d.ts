import type {Token} from './AgentTradingJev';
export const ATTRACTOR_COUNT:number;
export const TOKEN_EXIT_GRACE_MS:number;
export function selectAttractors(previous:Token[],incoming:Token[],options?:{now?:number;exitGraceMs?:number}):Token[];
