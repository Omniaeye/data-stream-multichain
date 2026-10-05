import type {Token} from './AgentTradingJev';import type {NewsLink} from './useNewsSnapshot';import type {TrenchesPreferences} from './trenches-policy';
export type SavedView={id:string;name:string;width:number;prefs:TrenchesPreferences};
export type TrenchesTools={width:number;watch:string[];views:SavedView[]};
export function readTools(raw:unknown):TrenchesTools;
export function matchesSearch(token:Token,links:NewsLink[],query:string):boolean;
