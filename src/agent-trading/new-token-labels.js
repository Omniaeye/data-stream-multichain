// A rotating ring marks every arrival. Text is suppressed only when another
// NEW label occupies the same screen space; zoom can reveal it again.
export function placeNewLabels(items){
 const accepted=[],visible=new Set();
 for(const item of items.slice().sort((a,b)=>b.time-a.time||a.key.localeCompare(b.key))){
  const r={left:item.x-17,right:item.x+17,top:item.y+item.radius+8,bottom:item.y+item.radius+20};
  if(accepted.some(p=>r.left<p.right+3&&r.right>p.left-3&&r.top<p.bottom+3&&r.bottom>p.top-3))continue;
  accepted.push(r);visible.add(item.key);
 }
 return visible;
}
