export function marketRoute(mode,{pathname='/',hostname=''}={}){
 if(pathname==='/')return mode==='trenches'?'/?preset=trenches&posts=1':'/?preset=jev'+(mode==='global'?'&view=global':'');
 if(mode==='trenches')return '/trenches/';
 const prefix=pathname==='/jev-test'||pathname.startsWith('/jev-test/')?'/jev-test/':'/jev/';
 return prefix+(mode==='global'?'?view=global':'');
}
export function initialMarketView(search=''){
 return new URLSearchParams(search).get('view')==='global'?'global':'discovery';
}
