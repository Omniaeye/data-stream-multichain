import test from 'node:test';import assert from 'node:assert/strict';
import {retainTrenches,newestTokens,launchTime,trenchesStories} from '../src/agent-trading/trenches-model.js';
const token=(id,chain='sol',created=100)=>({id,chain,name:'SAME',firstSeenAt:'2026-09-28T12:00:00Z',fields:[{key:'creation_timestamp',value:created,path:'/created'}],evidence:{captureId:'c',captureHash:'h'}});
test('retention preserves exact contracts, first discovery and removed tokens while updating metrics',()=>{
 const old=[token('Ab'),token('ab'),token('0xAA','bsc')],next=[{...token('Ab'),firstSeenAt:'2026-09-28T13:00:00Z',name:'UPDATED'},token('0xaa','bsc')];
 const result=retainTrenches(old,next);assert.equal(result.length,3);assert.equal(result.find(t=>t.id==='Ab').name,'UPDATED');assert.equal(result.find(t=>t.id==='Ab').firstSeenAt,old[0].firstSeenAt);assert.ok(result.some(t=>t.id==='ab'));assert.equal(retainTrenches(result,[],2).length,2);
});
test('newest uses creation time, falls back to first observation, and does not mutate the source',()=>{
 const old=token('old','sol',100),recent=token('new','sol',200),unknown={...token('unknown'),fields:[],firstSeenAt:new Date(300000).toISOString()},source=[old,recent,unknown];
 assert.deepEqual(newestTokens(source).map(t=>t.id),['unknown','new','old']);assert.equal(source[0],old);assert.equal(launchTime(unknown),null);
});
test('story map exposes all exact post references but excludes author profile association',()=>{
 const url='https://x.com/a/status/1234567',tokens=[{...token('Ab'),fields:[{key:'twitter',value:url,path:'/twitter'}]},{...token('Bb'),fields:[{key:'twitter',value:url,path:'/twitter'}]},{...token('profile'),fields:[{key:'twitter',value:'https://x.com/a',path:'/twitter'}]}];
 const links=[{event:{url,publishedAt:'2026-09-28T12:00:00Z'},evidence:[{tokenKey:'solana:profile',match:'author_profile',captureId:'c',captureHash:'h'}]}];
 const result=trenchesStories(links,tokens);assert.deepEqual([...result.byToken.keys()],['solana:Ab','solana:Bb']);assert.equal(result.byToken.get('solana:Ab')[0].evidence.length,1);
});
test('direct evidence precedes inferred related coverage, duplicate post URLs are not repeated',()=>{
 const ref={tokenKey:'solana:Ab',captureId:'c',captureHash:'h',match:'post_url'},direct={event:{url:'https://x.com/a/status/1234567',publishedAt:'2026-09-28T11:00:00Z'},evidence:[ref]},related={event:{url:'https://x.com/b/status/7654321',publishedAt:'2026-09-28T12:00:00Z'},evidence:[{...ref,inferred:true}]};
 const result=trenchesStories([related,direct,direct],[token('Ab')]);assert.deepEqual(result.byToken.get('solana:Ab').map(l=>l.event.url),[direct.event.url,related.event.url]);
});
