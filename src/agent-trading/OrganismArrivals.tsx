import {useEffect,useRef,useState} from 'react';
import type {Observation} from './token-observation';
import {arrivalBatches,enqueueArrivals,type Arrival} from './observation-arrivals';

export function useOrganismArrivals(observation:Observation|null){
 const previous=useRef<Observation|null>(null),queue=useRef<Arrival[]>([]);
 const [active,setActive]=useState<Arrival[]>([]),[pending,setPending]=useState(0),[omitted,setOmitted]=useState(0),[received,setReceived]=useState(0);
 const [paused,setPaused]=useState(false),[hidden,setHidden]=useState(document.hidden),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(media.matches),visibility=()=>setHidden(document.hidden);media.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};},[]);
 useEffect(()=>{
  if(!observation){previous.current=null;queue.current=[];setActive([]);setPending(0);return;}
  if(previous.current?.tokenKey!==observation.tokenKey){queue.current=[];setActive([]);setPending(0);setOmitted(0);setReceived(0);}
  let incoming:Arrival[]=[];
  try{incoming=arrivalBatches(previous.current,observation);}catch{return;}
  if(previous.current?.tokenKey===observation.tokenKey&&Date.parse(observation.receivedAt)<Date.parse(previous.current.receivedAt))return;
  previous.current=observation;
  if(!incoming.length)return;
  setReceived(n=>n+incoming.reduce((sum,b)=>sum+b.count,0));
  const result=enqueueArrivals(queue.current,incoming);queue.current=result.queue;setPending(result.queue.length);setOmitted(n=>n+result.omittedFields);
 },[observation]);
 useEffect(()=>{
  if(paused||hidden)return;
  if(active.length){const timer=setTimeout(()=>setActive([]),reduced?100:2800);return()=>clearTimeout(timer);}
  if(queue.current.length){setActive(queue.current.splice(0,5));setPending(queue.current.length);}
 },[active,pending,paused,hidden,reduced]);
 return {active,moving:!paused&&!hidden&&!reduced,paused,setPaused,reduced,pending,omitted,received};
}

export function ArrivalPaths({batches}:{batches:Arrival[]}){
 const zones=['market','distribution','risk','identity','social'],colors=['#83ead0','#a2bfff','#ebc688','#c0a9ef','#88cddd'];
 return <g aria-hidden="true" className="organism-arrivals">{batches.map(batch=>{
  const index=zones.indexOf(batch.zone);if(index<0)return null;
  const angle=-Math.PI/2+index*Math.PI*2/5,x=300+Math.cos(angle)*159,y=270+Math.sin(angle)*159,sx=300+Math.cos(angle)*244,sy=270+Math.sin(angle)*244;
  const path=`M${sx} ${sy} Q${x+22} ${y-20} ${x} ${y} Q${300+Math.cos(angle+.3)*80} ${270+Math.sin(angle+.3)*80} 300 270`;
  return <g key={batch.id}><circle r="5" fill={colors[index]} style={{offsetPath:`path("${path}")`,animation:'organism-travel 2.6s ease-in-out both'}}/><text x={sx} y={sy} textAnchor="middle" fill={colors[index]} fontSize="10">+{batch.count}</text></g>;
 })}</g>;
}
