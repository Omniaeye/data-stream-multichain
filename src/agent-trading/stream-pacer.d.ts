import type {BrainRoute} from './brain-routing';
import type {FieldGroup} from './field-families';
export function createStreamPacer():{setVisibleKeys(keys:string[]):void;add(route:BrainRoute,now:number,sources?:{chain:string;cadenceMs?:number;endpoint?:string}[],wallNow?:number):void;defer(milliseconds:number):void;take(now:number,wallNow?:number):FieldGroup[];stats():{received:number;shown:number;pending:number}};
