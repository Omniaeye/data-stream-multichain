import type {Capture,Token} from './AgentTradingJev';
export type Activity={id:string;kind:string;chain:string;token?:string;text:string;before?:unknown;after?:unknown;at?:string;captureId?:string};
export function logoUrl(value:unknown):string|null;
export function marketTokens(tokens:Token[],view:string,now?:number):Token[];
export function captureActivity(previous:Capture|undefined,next:Capture):{events:Activity[];changed:string[];observed:number;captures:number};
