import {observationSeed} from './observation-organisms.js';
export function tokenFieldBounds(width,height,compact){
 return Array.from({length:3},(_,band)=>compact?{x:12+band*(width-24)/3,y:height*.60,width:(width-24)/3-8,height:height*.33}:{x:width*.56,y:90+band*(height-124)/3,width:width*.42,height:(height-124)/3-12});
}
// Packing moves real 3D destinations, not just the DOM logos. A shared scale
// keeps market-cap ordering consistent across networks. No token is sampled out.
export function packTokenField(items,bounds,previous){
 const gap=Math.max(1.5,Math.min(5,bounds[0].width*.015)),area=[0,0,0];
 for(const item of items)area[item.band]+=Math.PI*(item.radius+gap/2)**2;
 let scale=Math.min(1.2,...bounds.map((b,i)=>area[i]?Math.sqrt(b.width*b.height*.43/area[i]):1.2));
 if(previous&&previous.scale<=scale&&previous.scale>scale*.85)scale=previous.scale;
 const sorted=items.slice().sort((a,b)=>Number(previous?.points.has(b.key)??false)-Number(previous?.points.has(a.key)??false)||b.radius-a.radius||a.key.localeCompare(b.key));
 for(let pass=0;pass<35;pass++,scale*=.91){
  const points=new Map(),grids=[new Map(),new Map(),new Map()],spacing=gap*Math.min(1,scale/.35);
  const cell=Math.max(2,...items.map(t=>t.radius*scale*2+spacing));
  function fits(p,b){
   if(p.x-p.radius<b.x||p.x+p.radius>b.x+b.width||p.y-p.radius<b.y||p.y+p.radius>b.y+b.height)return false;
   const nx=(p.x-b.x-b.width/2)/(b.width/2-p.radius),ny=(p.y-b.y-b.height/2)/(b.height/2-p.radius);
   if(nx**4+ny**4>1)return false;
   const gx=Math.floor(p.x/cell),gy=Math.floor(p.y/cell),grid=grids[p.band];
   for(let x=gx-1;x<=gx+1;x++)for(let y=gy-1;y<=gy+1;y++)for(const other of grid.get(x+':'+y)??[]){if(Math.hypot(p.x-other.x,p.y-other.y)<p.radius+other.radius+spacing)return false;}
   return true;
  }
  for(const item of sorted){
   const b=bounds[item.band],radius=item.radius*scale,old=previous?.points.get(item.key);
   let p=old?{...old,radius}:null;
   if(!p||!fits(p,b)){
    p=null;const sx=observationSeed(item.key),sy=observationSeed(item.key+':y');
    for(let attempt=0;attempt<900;attempt++){
     const candidate={x:b.x+radius+((sx+attempt*.61803398875)%1)*(b.width-2*radius),y:b.y+radius+((sy+attempt*.75487766625)%1)*(b.height-2*radius),radius,band:item.band};
     if(fits(candidate,b)){p=candidate;break;}
    }
   }
   if(!p)break;
   points.set(item.key,p);const grid=grids[p.band],key=Math.floor(p.x/cell)+':'+Math.floor(p.y/cell);
   if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p);
  }
  if(points.size===items.length)return {points,gap:spacing,scale};
 }
 throw new Error('Token field cannot fit the current viewport');
}
