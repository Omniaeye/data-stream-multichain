import type {Observation} from './token-observation';
export type Arrival={id:string;zone:string;captureId:string;receivedAt:string;count:number;changed:number};
export function arrivalBatches(previous:Observation|null,next:Observation):Arrival[];
export function enqueueArrivals(queue:Arrival[],incoming:Arrival[],limit?:number):{queue:Arrival[];omittedFields:number};
