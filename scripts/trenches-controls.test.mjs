import test from 'node:test';
import assert from 'node:assert/strict';
import {blockedEvent,tokenBlocked,tokenMatches,groupTokens,readPreferences,postIdentity,tickerIdentity,blockId} from '../src/agent-trading/trenches-policy.js';
import {postExcerpt} from '../src/agent-trading/trenches-social.js';
const event={url:'https://x.com/owner/status/12345',platform:'twitter',body:'Build water works',author:{handle:'owner',nativeId:'42'}};
const token=(id,cap,age=0)=>({id,chain:'sol',name:'Water',firstSeenAt:new Date(100000-age).toISOString(),fields:[{key:'symbol',value:'WATER'},...(cap===null?[]:[{key:'market_cap',value:cap}]),{key:'twitter',value:event.url}]});
const link={event,evidence:[{tokenKey:'solana:A',match:'post_url',inferred:false}]};
test('compact posts never create a clickable truncated URL',()=>{
 const url='https://example.com/'+ 'a'.repeat(250);
 assert.equal(postExcerpt('Read '+url),'Read…');
 assert.equal(postExcerpt('Read https://example.com OK'),'Read https://example.com OK');
});
test('profile scope independently controls news and tokens; old rules retain both',()=>{
 const b={key:'x:owner',label:'Owner'};
 assert.ok(blockedEvent(event,[b]));assert.ok(tokenBlocked(token('A',1),[link],[b]));
 assert.ok(!blockedEvent(event,[{...b,scope:'tokens'}]));assert.ok(tokenBlocked(token('A',1),[link],[{...b,scope:'tokens'}]));
 assert.ok(blockedEvent(event,[{...b,scope:'posts'}]));assert.ok(!tokenBlocked(token('A',1),[link],[{...b,scope:'posts'}]));
 assert.notEqual(blockId({...b,scope:'tokens'}),blockId({...b,scope:'posts'}));
 const p={...readPreferences(null),mode:'new',postsOnly:true,blocks:[{...b,scope:'posts'}]};
 assert.ok(tokenMatches(token('A',1),p,[link],110000,110000));
 assert.equal(groupTokens([token('A',1)],new Map([['solana:A',[link]]]),p.blocks)[0].key,event.url);
});
test('ticker rules are exact and case normalized, independent of the contract',()=>{
 assert.equal(tickerIdentity(token('A',1)),'ticker:water');
 assert.ok(tokenBlocked(token('B',1),[],[{key:'ticker:water',label:'WATER'}]));
 assert.ok(!tokenBlocked({...token('B',1),fields:[{key:'symbol',value:'WATERS'}]},[],[{key:'ticker:water'}]));
});
test('exact post blocks canonicalize X URLs without blocking the entire author',()=>{
 assert.equal(postIdentity('https://twitter.com/renamed/status/12345?s=20'),'post:x:12345');
 assert.equal(postIdentity('javascript:alert(1)'),null);
 const b={key:'post:x:12345',scope:'all'};assert.ok(blockedEvent(event,[b]));
 assert.ok(!blockedEvent({...event,url:'https://x.com/owner/status/99999'},[b]));
 assert.ok(tokenBlocked(token('A',1),[link],[b]));
});
test('keywords match literal text and direct post associations, not inferred or nested posts',()=>{
 const b={key:'keyword:water',scope:'all'};
 assert.ok(blockedEvent(event,[b]));assert.ok(tokenBlocked(token('A',1),[],[b]));
 const unrelated={...token('A',1),name:'Other',fields:[]};
 assert.ok(tokenBlocked(unrelated,[link],[b]));assert.ok(!tokenBlocked(unrelated,[{...link,evidence:[{...link.evidence[0],inferred:true}]}],[b]));
 assert.ok(!blockedEvent({...event,body:'Hello',contexts:[{event}]},[b]));
 assert.ok(!blockedEvent(event,[{key:'keyword:.*',scope:'all'}]));
});
test('Hot tokens orders within the same post, leaves unlinked newest first, and never mutates input',()=>{
 const a=token('A',100,0),b=token('B',500,1000),c=token('C',null,2000),d=token('D',null,3000);
 const map=new Map([a,b,c,d].map(t=>['solana:'+t.id,[link]]));
 assert.deepEqual(groupTokens([a,b,c,d],map,[],true)[0].tokens.map(t=>t.id),['B','A','C','D']);
 assert.deepEqual(groupTokens([a,b,c,d],map,[],false)[0].tokens.map(t=>t.id),['A','B','C','D']);
 assert.deepEqual(groupTokens([c,d],map,[],true)[0].tokens.map(t=>t.id),['C','D']);
 assert.deepEqual(groupTokens([a,b],new Map(),[],true)[0].tokens.map(t=>t.id),['A','B']);
});
test('new rules and ordering persist, malformed rules fail closed to non-matching',()=>{
 const p=readPreferences({hot:true,quickActions:false,blocks:[{key:'keyword:water',label:'water',scope:'tokens'},{key:'ticker:water',label:'WATER',scope:'all'},{key:'garbage',label:'bad'}]});
 assert.equal(p.hot,true);assert.equal(p.quickActions,false);assert.equal(p.blocks.length,2);
});
