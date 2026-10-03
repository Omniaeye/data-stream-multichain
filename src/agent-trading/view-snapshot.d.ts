import type {Capture} from './AgentTradingJev';
export function makeViewCapture(capture:Capture):Capture;
export function readView(storage:Pick<Storage,'getItem'>,now?:number):Capture|undefined;
export function saveView(storage:Pick<Storage,'setItem'>,capture:Capture,now?:number):void;
