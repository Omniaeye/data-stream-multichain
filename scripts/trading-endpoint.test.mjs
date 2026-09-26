/** © 2026 OMNIA EYE Corporation. All Rights Reserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnector} from '../src/server/connector.mjs';
import {createTradingSession,TP_MULTIPLES} from '../src/agent-trading/trading-session.js';
function response(){return {writeHead(status){this.status=status;},end(body){this.body=body;}};}
test('public presentation cursor accepts only bounded read requests',async()=>{
 let requests=0;
 const serve=createConnector({DATA_STREAM_UPSTREAM:'https://core.example',JEV_GATEWAY_KEY:'test-only'},{fetchImpl:async url=>{requests++;assert.equal(url.pathname,'/__jev/trading');return new Response('{"mode":"presentation","ordersEnabled":false}');}});
 for(const query of ['?after=-1','?after=1&after=2','?after=Infinity','?url=https://other.test','?after=10000000000000000']){
  const res=response();await serve({method:'GET',headers:{}},res,new URL('https://site/__jev/trading'+query));assert.equal(res.status,400);
 }
 const post=response();await serve({method:'POST',headers:{}},post,new URL('https://site/__jev/trading'));assert.equal(post.status,405);assert.equal(requests,0);
 const res=response();await serve({method:'GET',headers:{}},res,new URL('https://site/__jev/trading?after=3176'));assert.equal(res.status,200);assert.equal(requests,1);assert.equal(JSON.parse(res.body).ordersEnabled,false);
});
test('every presentation position keeps its network and only closes after entry',()=>{
 const session=createTradingSession({seed:612}),positions=new Map();
 const events=session.advance(9000);assert.equal(events.length,2100);
 for(const event of events){
  assert.equal(event.kind,'presentation');assert.ok(['robinhood','solana','bsc'].includes(event.chain));assert.ok(event.openCount<=10);
  if(event.action==='SKIP')continue;
  const previous=positions.get(event.positionId);
  if(!previous){assert.equal(event.action,'BUY');assert.equal(event.multiple,1);}
  else{assert.notEqual(previous.status,'closed');assert.equal(event.chain,previous.chain);}
  if(event.action in TP_MULTIPLES)assert.equal(event.multiple,TP_MULTIPLES[event.action]);
  positions.set(event.positionId,event);
 }
 assert.ok([...positions.values()].some(p=>p.status==='closed'));
});
