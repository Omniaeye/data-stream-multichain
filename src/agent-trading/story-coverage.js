// Conservative lexical evidence, not a model verdict or token-name association.
const stop=new Set('a an the and or to of in on for is are be been we were us as at by it its this that with from says said say claims declares just breaking now new news ceo entering even really because will would could should'.split(' '));
export function coverageSignature(event){
 const text=String(event.body||event.title||'').slice(0,2000).toLowerCase().normalize('NFKC').replace(/https?:\/\/\S+/g,'').replace(/[’']/g,'').replace(/\b(?:wont|dont|doesnt|cannot|cant)\b/g,'not').replace(/\b(?:kids|children|child)\b/g,'child').replace(/\b(?:skills|skill)\b/g,'').replace(/\b(?:denies|denied|deny|false|fake)\b/g,'denial');
 const words=(text.match(/[\p{L}\p{N}]+/gu)??[]).filter(w=>w.length>1&&!stop.has(w)),terms=new Set(words),pairs=new Set(words.slice(1).map((w,i)=>words[i]+' '+w));
 return {terms,pairs,negative:terms.has('not'),denial:terms.has('denial')};
}
export function sameCoverage(a,b){
 if(a.terms.size<8||b.terms.size<8||a.negative!==b.negative||a.denial!==b.denial)return false;
 const common=[...a.terms].filter(w=>b.terms.has(w)).length,pairs=[...a.pairs].filter(w=>b.pairs.has(w)).length;
 return common>=7&&common/Math.min(a.terms.size,b.terms.size)>=.72&&common/(a.terms.size+b.terms.size-common)>=.5&&pairs>=2;
}
