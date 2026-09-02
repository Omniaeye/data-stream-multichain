// Low-discrepancy radii stay bounded even after hours of ranking turnover.
export function tokenSlotPosition(slot,band,compact){
 let n=slot+1,weight=.5,fraction=0;
 while(n>0){fraction+=(n%2)*weight;n=Math.floor(n/2);weight*=.5;}
 const a=slot*2.39996323,r=Math.sqrt(fraction);
 return [compact?(band-1)*1.8+Math.cos(a)*r*.78:3.55+Math.cos(a)*r*1.65,
  compact?-3.35+Math.sin(a)*r*1.1:(1-band)*2+Math.sin(a)*r*.95,
  Math.sin(a*1.7)*.15];
}
