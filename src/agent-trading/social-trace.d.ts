import type {NewsLink} from './useNewsSnapshot';
export function trackedSocialKeys(links:NewsLink[],now?:number):Set<string>;
export function socialProfileUrl(value:unknown):string|null;
export function authorProfile(event:unknown):string|null;
