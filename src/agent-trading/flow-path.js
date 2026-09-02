export const CATEGORY_ORDER=['Market','Holders','Risk','Lifecycle','Social','Other'];
export function catmull(a,b,c,d,t){
 const t2=t*t,t3=t2*t;
 return b.map((v,i)=>.5*((2*v)+(-a[i]+c[i])*t+(2*a[i]-5*v+4*c[i]-d[i])*t2+(-a[i]+3*v-3*c[i]+d[i])*t3));
}
export function journeyPoint(path,progress,seed=0,time=0){
 const p=Math.max(0,Math.min(1,progress)),segment=p<.36?0:p<.53?1:2;
 const t=segment===0?p/.36:segment===1?(p-.36)/.17:(p-.53)/.47;
 const [a,b,c,d]=path,q=segment===0?catmull(a,a,b,c,t):segment===1?catmull(a,b,c,d,t):catmull(b,c,d,d,t);
 const envelope=Math.sin(Math.PI*t)**2*(segment===0?.28:segment===1?.06:.12),phase=seed*Math.PI*2;
 q[0]+=Math.sin(t*Math.PI*2+phase+time*.24)*.24*envelope;
 q[1]+=Math.sin(t*Math.PI*2+phase+time*.32)*envelope;
 q[2]+=Math.cos(t*Math.PI*2+phase+time*.27)*envelope;
 return q;
}

// Spatial variation is deterministic per observation, never new data.
export function sourceOffset(seed,width,compact=false){
 const a=seed*Math.PI*2,r=Math.sqrt((seed*13.73)%1),spread=Math.min(.29,.17+width*.2);
 const lateral=Math.cos(a)*r*spread,depth=Math.sin(a)*r*.28,ahead=.38+((seed*7.17)%1)*.44;
 return compact?[lateral,-ahead,depth]:[ahead,lateral,depth];
}
