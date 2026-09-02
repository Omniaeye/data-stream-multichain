import type {Token} from './AgentTradingJev';
export type ObservationMetadata={endpoint:string;chain:string;capture_id:string;raw_sha256:string;received_at:string;source_event_at?:string|null;request_params?:{query?:{interval?:string|null}}};
export type ObservationField={key:string;zone:string;status:string;raw:string|number|boolean|null;unit:string;semanticStatus:string;window:string|null;eventTime:string|null;evidence:{fieldId:string;path:string;captureId:string;captureHash:string}|null};
export type Observation={tokenKey:string;captureId:string;receivedAt:string;fields:ObservationField[]};
export function observeToken(token:Token,metadata:ObservationMetadata):Observation;
