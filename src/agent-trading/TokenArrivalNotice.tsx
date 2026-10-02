import {useEffect,useRef,useState} from 'react';
import type {Token} from './AgentTradingJev';
import {createTokenArrivals} from './token-arrivals';
import {tokenKey} from './token-selection';
import {TOKEN_ACTIVITY_POLICY} from './token-eligibility';
// Detection remains separate from the renderer. First snapshot is a baseline.
export function TokenArrivalNotice({tokens,eligibleKeys,onArrival,historyKey,enabled=true}:{tokens:Token[];eligibleKeys:string[];onArrival:(keys:string[])=>void;historyKey?:string;enabled?:boolean}){
 const [detector]=useState(()=>{try{return createTokenArrivals({storage:window.localStorage,storageKey:historyKey,pendingMs:TOKEN_ACTIVITY_POLICY.introMs});}catch{return createTokenArrivals({pendingMs:TOKEN_ACTIVITY_POLICY.introMs});}});
 const handler=useRef(onArrival);handler.current=onArrival;
 useEffect(()=>{if(!enabled)return;const next=detector.ingest(tokens,eligibleKeys,Date.now());if(next)handler.current(next.tokens.map(tokenKey));},[tokens,eligibleKeys,detector,enabled]);
 return null;
}
