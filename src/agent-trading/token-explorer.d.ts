import type {Token} from './AgentTradingJev';
export function exploreTokens(tokens:Token[],options?:{query?:string;page?:number;selectedKey?:string|null;pageSize?:number;sceneLimit?:number}):{matches:number;pages:number;page:number;rows:Token[];scene:Token[]};
