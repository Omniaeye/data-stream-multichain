import type {Token,Capture} from './AgentTradingJev';
export type SocialLink={url:string;platform:string;label:string;field:string;path:string;captureId:string|null};
export function compactCap(value:unknown):string;
export function tokenTicker(token:Token):string;
export function publicLink(value:unknown):string|null;
export function tokenSocials(tokens:Token[]):SocialLink[];
export function tokenSnapshots(token:Token,capture?:Capture):Token[];
