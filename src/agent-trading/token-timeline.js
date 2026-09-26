import {observationSeed} from './observation-organisms.js';
import {sceneAnchors} from './scene-anchors.js';

export function timelineTime(token){const time=Date.parse(token.firstSeenAt);return Number.isFinite(time)?time:0;}
export function timelineBounds(width,height,compact,items=[]){
 const anchors=compact?sceneAnchors(width,height,true):null;
 const top=compact?Math.max(height*.64,anchors.trading.y+anchors.trading.height+48):128,bottom=height-24,space=bottom-top;
 const weights=[0,1,2].map(band=>items.filter(t=>t.band===band).reduce((n,t)=>n+(t.radius+8)**2,0)),total=weights.reduce((a,b)=>a+b,0);
 let y=top;
 return weights.map(weight=>{const height=space*(total ? .16+.52*weight/total : 1/3),bound={x:compact?16:width*.50,y,
  width:compact?width-32:width*.48,height:height-(compact?8:18)};y+=height;return bound;});
}

// Columns are ordered by first observation, newest to oldest. Vertical packing
// only resolves collisions; horizontal order never comes from price or ticker.
export function packTokenTimeline(items,bounds,{labels=false,scroll=false,unified=false,compact=false}={}){
 if(unified)bounds=[{...bounds[0],height:bounds.at(-1).y+bounds.at(-1).height-bounds[0].y}];
 const bands=bounds.map((_,band)=>items.filter(t=>unified||t.band===band).sort((a,b)=>b.time-a.time||a.key.localeCompare(b.key)));
 let scale=compact?1:1.2;
 for(let attempt=0;attempt<90;attempt++,scale*=.94){
  const gap=compact?8:Math.max(labels?12:2,22*scale),points=new Map();let fits=true,contentWidth=0;
  for(let band=0;band<bands.length;band++){
   const b=bounds[band],columns=[];let column=[],height=0;
   const footprint=item=>item.radius*scale*2+(labels?34:0)+(item.arriving?22:0);
   for(const item of bands[band]){
    const diameter=footprint(item);
    if(diameter>b.height){fits=false;break;}
    if(column.length&&height+gap+diameter>b.height){columns.push(column);column=[];height=0;}
    column.push(item);height+=diameter+(column.length>1?gap:0);
   }
   if(!fits)break;if(column.length)columns.push(column);
   const widths=columns.map(c=>Math.max(labels?72:0,...c.map(t=>t.radius*scale*2))),used=widths.reduce((a,b)=>a+b,0)+gap*Math.max(0,columns.length-1);
   if(used>b.width&&!scroll){fits=false;break;}
   contentWidth=Math.max(contentWidth,used);
   // Let sparse fields breathe; dense fields keep a shared radius scale.
   const horizontal=columns.length>1?gap+(compact?0:Math.max(0,Math.min(34,(b.width-used)/(columns.length-1)))):gap;
   let x=b.x;
   columns.forEach((c,i)=>{
    const usedHeight=c.reduce((n,t)=>n+footprint(t),0)+gap*(c.length-1),free=b.height-usedHeight;
    let y=b.y+free*(.25+observationSeed(c[0].key)*.5);
    for(const item of c){const radius=item.radius*scale;points.set(item.key,{x:x+widths[i]/2,y:y+radius,radius,band:item.band});y+=footprint(item)+gap;}
    x+=widths[i]+horizontal;
   });
  }
  if(fits&&points.size===items.length)return {points,gap,scale,contentWidth};
 }
 throw new Error('Timeline cannot fit current viewport');
}
