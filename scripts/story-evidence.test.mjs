import test from 'node:test';import assert from 'node:assert/strict';
import {storyEvidence,tokenStoryLinks} from '../src/agent-trading/story-evidence.js';
const event={url:'https://x.com/i/status/1234567'};
const t=(id,name,url)=>({id,name,chain:'robinhood',fields:[{key:'twitter',value:url,path:'/twitter'}],evidence:{captureId:'capture-'+id,captureHash:'hash-'+id,receivedAt:'2026-09-28T12:00:00Z'}});
test('a profile does not attribute every post to GOOGL; all exact post references are shown',()=>{
 const tokens=[t('g','GOOGL','https://x.com/RobinhoodApp'),t('a','ONE','https://x.com/RobinhoodApp/status/1234567'),t('b','TWO','https://twitter.com/RobinhoodApp/status/1234567')];
 const link={event,evidence:[{tokenKey:'robinhood:g',match:'author_profile',captureId:'c',captureHash:'h'}]};
 assert.deepEqual(storyEvidence(link,tokens).map(x=>x.tokenKey),['robinhood:a','robinhood:b']);
 assert.equal(storyEvidence({...link,event:{url:'https://x.com/i/status/999999'}},tokens).length,0);
});

test('inspection uses enriched post links and keeps an explicitly opened source after feed removal',()=>{
 const token=t('a','ANIMALS','https://x.com/user/status/1234567'),other=t('b','ANIMALS','https://x.com/user/status/7654321');
 const now=Date.parse('2026-09-28T12:01:00Z'),link={event:{...event,platform:'twitter',publishedAt:'2026-09-28T12:00:00Z'},evidence:[]};
 const result=tokenStoryLinks([link],[token,other],'robinhood:a',null,now);
 assert.equal(result.length,1);assert.deepEqual(result[0].evidence.map(r=>r.tokenKey),['robinhood:a']);
 assert.equal(tokenStoryLinks([link],[token,other],'robinhood:b',null,now).length,0);
 assert.equal(tokenStoryLinks([],[token],'robinhood:a',result[0],now+4*3600000).length,1);
 const profile={event:link.event,evidence:[{tokenKey:'robinhood:b',match:'author_profile',captureId:'c',captureHash:'h'}]};
 assert.equal(tokenStoryLinks([profile],[other],'robinhood:b',null,now).length,0);
});
