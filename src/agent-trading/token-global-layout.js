import {observationSeed} from './observation-organisms.js';
import {sceneAnchors} from './scene-anchors.js';

export function globalBounds(width,height,compact,items){
 const anchors=compact?sceneAnchors(width,height,true):null;
 const top=compact?Math.max(height*.62,anchors.origin[1]+anchors.brainWidth*.64+36):88,bottom=height-(compact?16:24),space=bottom-top;
 const weights=[0,1,2].map(band=>items.filter(i=>i.band===band).reduce((sum,i)=>sum+Math.max(104,i.radius*2)*(i.radius*2+52),0));
 const total=weights.reduce((a,b)=>a+b,0);let y=top;
 return weights.map(weight=>{const h=space*(total ? .1+.7*weight/total : 1/3),b={x:compact?18:width*.49,y,width:compact?width-36:width*.49,height:h-8};y+=h;return b;});
}

// Pack circle + caption + NEW marker as one rectangle. All nodes keep the
// same scale, so cap comparisons survive even when the entire roster is dense.
export function packGlobalTokens(items,bounds,previous){
 const ordered=items.slice().sort((a,b)=>b.radius-a.radius||a.key.localeCompare(b.key));
 const area=bounds.map((_,band)=>items.filter(t=>t.band===band).reduce((n,t)=>n+Math.max(104,t.radius*2)*(t.radius*2+52),0));
 let scale=Math.min(1,...bounds.map((b,i)=>area[i]?Math.sqrt(b.width*b.height*.65/area[i]):1));
 for(let pass=0;pass<75;pass++,scale*=.95){
  const points=new Map(),grid=new Map(),labelScale=Math.min(1,scale*2),cell=Math.max(100*scale,52*labelScale),gap=4*scale;
  const intersects=(a,b)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+gap&&Math.abs(a.centerY-b.centerY)<(a.height+b.height)/2+gap;
  function fits(p,b){
   if(p.x-p.width/2<b.x||p.x+p.width/2>b.x+b.width||p.centerY-p.height/2<b.y||p.centerY+p.height/2>b.y+b.height)return false;
   const gx=Math.floor(p.x/cell),gy=Math.floor(p.centerY/cell);
   for(let x=gx-2;x<=gx+2;x++)for(let y=gy-2;y<=gy+2;y++)for(const q of grid.get(x+':'+y)??[])if(intersects(p,q))return false;
   return true;
  }
  for(const item of ordered){
   const b=bounds[item.band],radius=item.radius*scale,width=Math.max(52*labelScale,2*radius),caption=(26+(item.arriving?16:0))*labelScale,height=2*radius+caption;
   const sx=observationSeed(item.key),sy=observationSeed(item.key+':global'),old=previous?.points.get(item.key);let point;
   for(let attempt=-1;attempt<700;attempt++){
    if(attempt<0&&!old)continue;
    const x=attempt<0?old.x:b.x+width/2+((sx+attempt*.61803398875)%1)*(b.width-width);
    const centerY=attempt<0?old.y+caption/2:b.y+height/2+((sy+attempt*.75487766625)%1)*(b.height-height);
    const p={x,y:centerY-caption/2,centerY,radius,width,height,band:item.band};
    if(fits(p,b)){point=p;break;}
   }
   if(!point)break;
   points.set(item.key,point);const key=Math.floor(point.x/cell)+':'+Math.floor(point.centerY/cell);
   if(!grid.has(key))grid.set(key,[]);grid.get(key).push(point);
  }
  if(points.size===items.length)return {points,scale,labelScale,gap,contentWidth:bounds[0].width};
 }
 throw new Error('Global token layout could not fit the roster');
}
