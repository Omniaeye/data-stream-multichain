import {tokenKey} from './token-selection.js';
const STATES=['accepted','probable','insufficient','needs_review','failed'];
export function attachAssessments(tokens,document){
 if(!document||document.schema!=='jev.trading.assessments.v1'||!Array.isArray(document.items)||document.items.length>600)throw new Error('Invalid assessment envelope');
 const byKey=new Map();
 for(const a of document.items){
  if(!a||!['robinhood','bsc','solana'].includes(a.chain)||typeof a.token!=='string'||!STATES.includes(a.status)||typeof a.id!=='string'||typeof a.captureId!=='string'||typeof a.captureHash!=='string'||typeof a.model!=='string'||!a.model||typeof a.modelVersion!=='string'||!a.modelVersion||!Number.isFinite(Date.parse(a.evaluatedAt))||typeof a.summary!=='string'||a.summary.length>2000||!Array.isArray(a.fieldIds)||!a.fieldIds.length||a.fieldIds.length>100||a.fieldIds.some(id=>typeof id!=='string'))throw new Error('Invalid assessment');
  const key=tokenKey({id:a.token,chain:a.chain});
  if(byKey.has(key))throw new Error('Ambiguous assessment');
  byKey.set(key,a);
 }
 return tokens.map(token=>{
  const a=byKey.get(tokenKey(token)),e=token.evidence;
  if(!a||!e||a.captureId!==e.captureId||a.captureHash!==e.captureHash||a.fieldIds.some(id=>!token.fields.some(f=>f.id===id)))return token;
  return {...token,assessment:{id:a.id,status:a.status,model:a.model,modelVersion:a.modelVersion,evaluatedAt:a.evaluatedAt,summary:a.summary,fieldIds:a.fieldIds}};
 });
}
