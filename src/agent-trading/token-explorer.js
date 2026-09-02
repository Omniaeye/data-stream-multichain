import {tokenKey} from './token-selection.js';
export function exploreTokens(tokens,{query='',page=0,selectedKey=null,pageSize=24,sceneLimit=60}={}){
 const q=query.trim().toLowerCase();
 const matches=tokens.filter(t=>!q||`${t.name} ${t.id} ${t.chain}`.toLowerCase().includes(q));
 const pages=Math.max(1,Math.ceil(matches.length/pageSize)),index=Math.max(0,Math.min(Math.floor(page)||0,pages-1));
 const scene=tokens.slice(0,sceneLimit),selected=tokens.find(t=>tokenKey(t)===selectedKey);
 if(selected&&!scene.some(t=>tokenKey(t)===selectedKey)){if(scene.length===sceneLimit)scene.pop();scene.push(selected);}
 return {matches:matches.length,pages,page:index,rows:matches.slice(index*pageSize,(index+1)*pageSize),scene};
}
