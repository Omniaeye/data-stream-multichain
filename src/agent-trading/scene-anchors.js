// Shared screen-space composition, converted by the reference camera.
// News occupies the upper left; the token field has its own reserved bounds.
export function sceneAnchors(width,height,compact=false){
 if(compact)return {origin:[width*.5,height*.425],ports:[.20,.50,.80].map(x=>[width*x,Math.min(232,height*.275)]),brainWidth:Math.min(width*.54,height*.27)};
 return {origin:[width*.28,height*.62],ports:[.44,.63,.82].map(y=>[Math.min(40,width*.05),height*y]),brainWidth:Math.min(width*.30,height*.39)};
}
