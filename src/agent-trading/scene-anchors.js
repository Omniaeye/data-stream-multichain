// Shared screen-space composition, converted by the reference camera.
// News occupies the upper left; the token field has its own reserved bounds.
export function sceneAnchors(width,height,compact=false){
 if(compact){
  const portsY=height<=700?184:248,brainWidth=Math.min(width*.50,height*.18);
  const originY=Math.max(height*.34,portsY+32+brainWidth*.37);
  const trading={x:16,y:originY+brainWidth*.64+18,width:width-32,height:Math.max(140,Math.min(176,height*.18))};
  return {origin:[width*.5,originY],ports:[.20,.50,.80].map(x=>[width*x,portsY]),brainWidth,trading};
 }
 const tradingHeight=Math.min(200,Math.max(140,height*.22));
 return {origin:[width*.28,height*.53],ports:[.39,.54,.69].map(y=>[Math.min(40,width*.05),height*y]),brainWidth:Math.min(width*.30,height*.30),trading:{x:16,y:height-tradingHeight-16,width:width*.48-24,height:tradingHeight}};
}
