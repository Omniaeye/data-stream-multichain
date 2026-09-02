import {useLayoutEffect,useRef} from 'react';
import {createValueMotion} from './value-motion';
import {compactCap} from './token-details';
export function AnimatedMarketCap({value}:{value:number|null}){
 const element=useRef<HTMLElement>(null),motion=useRef(createValueMotion());
 useLayoutEffect(()=>{const m=motion.current;let frame:number|undefined;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;m.set(value,performance.now(),reduced);
  const paint=(now:number)=>{if(element.current){element.current.textContent=compactCap(m.at(now));element.current.dataset.updating=String(m.active(now));}if(m.active(now))frame=requestAnimationFrame(paint);};
  paint(performance.now());return()=>{if(frame!==undefined)cancelAnimationFrame(frame);};
 },[value]);
 return <strong ref={element} data-market-cap={value??''} title={value===null?'Not supplied':String(value)}>{compactCap(value)}</strong>;
}
