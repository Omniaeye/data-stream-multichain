import test from 'node:test';
import assert from 'node:assert/strict';
import {marketRoute,initialMarketView} from '../src/agent-trading/market-route.js';
import {jevEndpoint} from '../src/agent-trading/jev-endpoint.js';

test('public navigation has distinct Trenches, Trending and Global destinations',()=>{
 const here={pathname:'/trenches/',hostname:'data-stream-multichain-production.up.railway.app'};
 assert.equal(marketRoute('trenches',here),'/trenches/');
 assert.equal(marketRoute('discovery',here),'/jev/');
 assert.equal(marketRoute('global',here),'/jev/?view=global');
 assert.equal(initialMarketView('?view=global'),'global');
 assert.equal(initialMarketView('?view=other'),'discovery');
 assert.equal(initialMarketView(''),'discovery');
 assert.equal(jevEndpoint('/__jev/news','/trenches/'),'/trenches/__jev/news');
 assert.equal(jevEndpoint('/__jev/live?sync=1','/trenches'),'/trenches/__jev/live?sync=1');
 assert.equal(jevEndpoint('/__jev/news','/trenches-other'),'/__jev/news');
});
test('website navigation stays on the same domain; local and private JEV navigation retain scope',()=>{
 assert.equal(marketRoute('trenches',{pathname:'/jev/',hostname:'eyeomnia.com'}),'/trenches/');
 assert.equal(marketRoute('global',{pathname:'/jev-test/'}),'/jev-test/?view=global');
 assert.equal(marketRoute('global',{pathname:'/'}),'/?preset=jev&view=global');
 assert.equal(marketRoute('trenches',{pathname:'/'}),'/?preset=trenches&posts=1');
});
