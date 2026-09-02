import {useEffect,useState} from 'react';
export type NewsReference={match?:string;basisUrl?:string;basisTitle?:string;inferred?:boolean;tokenKey:string;field:string;path?:string;sourceUrl:string;receivedAt:string|null;captureId:string;captureHash?:string};
export type NewsLink={event:{id:string;url:string;sourceUrl?:string;title:string;body?:string;platform:string;sourceLabel:string;media?:Array<{type:string;url:string;posterUrl?:string}>;author?:{name:string;handle:string;avatar:string|null;followers:number|null};publishedAt:string|null;observedAt:string|null;cachedAt:string};relation:string;evidence:NewsReference[]};
export type NewsSnapshot={links:NewsLink[];meta:{status:string;lastSync:string|null;cached:number;matched:number;references:number;error:string|null}};
export function useNewsSnapshot(enabled:boolean){
 const [snapshot,setSnapshot]=useState<NewsSnapshot|null>(null),[disconnected,setDisconnected]=useState(false),[now,setNow]=useState(Date.now);
 useEffect(()=>{if(!enabled)return;let stopped=false,timer:ReturnType<typeof setTimeout>;const controller=new AbortController();
  async function read(){try{const response=await fetch('/__jev/news',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});if(!response.ok)throw new Error();const result=await response.json();if(!stopped){setSnapshot(result);setDisconnected(false);}}catch{if(!stopped)setDisconnected(true);}finally{if(!stopped){setNow(Date.now());timer=setTimeout(read,5000);}}}
  void read();return()=>{stopped=true;controller.abort();clearTimeout(timer);};
 },[enabled]);
 return {snapshot,disconnected,now};
}
