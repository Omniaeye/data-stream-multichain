import type {BrainDatum,BrainRoute} from './brain-routing';
export const DATA_STREAM_LIMIT:number;
export type DataStreamState={rows:BrainDatum[];total:number;unverified:number;captures:number;latest?:string;byChain?:Record<string,number>};
export function appendDataStream(state:DataStreamState,route:BrainRoute):DataStreamState;
