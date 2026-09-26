import type {BrainRoute} from './brain-routing';
import type {FieldGroup} from './field-families';
export function createStreamPacer():{setVisibleKeys(keys:string[]):void;resetWindow():void;resume(now:number):void;add(route:BrainRoute,now:number,sources?:{chain:string;cadenceMs?:number;endpoint?:string}[],wallNow?:number):void;defer(milliseconds:number):void;take(now:number,wallNow?:number):FieldGroup[];stats():{received:number;shown:number;superseded:number;pending:number}};
