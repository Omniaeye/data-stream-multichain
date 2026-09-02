// Screen-space separation is presentation only, never a market relationship.
export function separateLogos(points,width,height){
 const items=points.map(p=>({...p}));
 const clamp=p=>{p.x=Math.min(Math.max(p.x,p.radius+8),Math.max(p.radius+8,width-p.radius-8));p.y=Math.min(Math.max(p.y,p.radius+70),Math.max(p.radius+70,height-p.radius-95));};
 items.forEach(clamp);
 for(let pass=0;pass<16;pass++){
  let moved=false;
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=items[i],b=items[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);const minimum=a.radius+b.radius+7;
   if(d>=minimum)continue;
   if(d<.001){dx=(i+j)%2?1:-1;dy=(i%3)-1;d=Math.hypot(dx,dy);}
   const push=(minimum-d)/2+.1,ux=dx/d,uy=dy/d;
   a.x-=ux*push;a.y-=uy*push;b.x+=ux*push;b.y+=uy*push;clamp(a);clamp(b);moved=true;
  }
  if(!moved)break;
 }
 return items;
}
