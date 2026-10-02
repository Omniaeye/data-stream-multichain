import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAttractors,TOKEN_EXIT_GRACE_MS} from '../src/agent-trading/attractor-selection.js';
import {tokenKey} from '../src/agent-trading/token-selection.js';
const at=Date.parse('2026-10-03T16:00:00Z');
const token=chain=>({id:'same',chain,name:chain,phase:'active',fields:[],evidence:{captureId:chain,captureHash:'a'.repeat(64),receivedAt:new Date(at).toISOString()}});
test('a delayed source can retain its existing absent identity without renewing its evidence',()=>{
 const original=token('bsc'),holdMissingKeys=new Set([tokenKey(original)]);
 let roster=selectAttractors([original],[token('solana')],{now:at+1000,exitGraceMs:TOKEN_EXIT_GRACE_MS,holdMissingKeys});
 roster=selectAttractors(roster,[token('solana')],{now:at+600000,exitGraceMs:TOKEN_EXIT_GRACE_MS,holdMissingKeys});
 const held=roster.find(t=>tokenKey(t)===tokenKey(original));
 assert.ok(held,'the delayed source must not disappear after the ordinary exit grace');
 assert.deepEqual(held.evidence,original.evidence);assert.equal(held.sceneAbsentSince,undefined);
});
test('a fresh source omission starts ordinary exit grace after its delayed hold ends',()=>{
 const original=token('bsc'),holdMissingKeys=new Set([tokenKey(original)]);
 const held=selectAttractors([original],[],{now:at+600000,exitGraceMs:TOKEN_EXIT_GRACE_MS,holdMissingKeys});
 const leaving=selectAttractors(held,[],{now:at+700000,exitGraceMs:TOKEN_EXIT_GRACE_MS});
 assert.equal(leaving[0].sceneAbsentSince,at+700000);
 assert.equal(selectAttractors(leaving,[],{now:at+700000+TOKEN_EXIT_GRACE_MS,exitGraceMs:TOKEN_EXIT_GRACE_MS}).length,0);
});
test('source retention cannot invent identities and an incoming observation replaces the held record',()=>{
 const original=token('bsc'),holdMissingKeys=new Set([tokenKey(original),'bsc:unknown']);
 assert.deepEqual(selectAttractors([],[],{now:at,exitGraceMs:TOKEN_EXIT_GRACE_MS,holdMissingKeys}),[]);
 const fresh={...original,name:'Fresh',evidence:{...original.evidence,captureId:'fresh'}};
 const next=selectAttractors([original],[fresh],{now:at+600000,exitGraceMs:TOKEN_EXIT_GRACE_MS,holdMissingKeys});
 assert.equal(next.length,1);assert.equal(next[0],fresh);
});
