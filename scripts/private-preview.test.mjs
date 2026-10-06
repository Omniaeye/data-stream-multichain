import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrivatePreview} from '../src/server/private-preview.mjs';
import {createConnector} from '../src/server/connector.mjs';
import {jevEndpoint} from '../src/agent-trading/jev-endpoint.js';
const login='test-user:fixture-password',auth='Basic '+Buffer.from(login).toString('base64');
async function setup(t,{enabled=true}={}){
 const root=await mkdtemp(join(tmpdir(),'jev-private-test-'));await mkdir(join(root,'assets'));
 await writeFile(join(root,'index.html'),'PRIVATE VIEWER');await writeFile(join(root,'assets','viewer.js'),'private-script');
 const upstream=[];
 const connector=createConnector({DATA_STREAM_UPSTREAM:'https://upstream.invalid',JEV_GATEWAY_KEY:'fixture-upstream-secret'},{
  fetchImpl:async(url,options)=>{upstream.push({path:url.pathname+url.search,authorization:options.headers.Authorization});return new Response('{"tokens":[]}',{headers:{etag:'"fixture"'}});}
 });
 const handler=createPrivatePreview({root,env:enabled?{JEV_TEST_AUTH_SHA256:createHash('sha256').update(login).digest('hex')}:{},connector});
 const server=createServer(async(req,res)=>{if(await handler(req,res,new URL(req.url,'https://local.invalid')))return;res.writeHead(503);res.end('MAINTENANCE');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});});
 return {origin:'http://127.0.0.1:'+server.address().port,upstream};
}
test('private HTML, scripts and data all reject missing or wrong credentials before upstream work',async t=>{
 const {origin,upstream}=await setup(t);
 for(const path of ['/jev-test/','/jev-test/index.html','/jev-test/assets/viewer.js','/jev-test/__jev/live?sync=1']){
  for(const authorization of [undefined,'Bearer invalid','Basic '+Buffer.from('wrong:password').toString('base64')]){
   const r=await fetch(origin+path,{headers:authorization?{authorization}:{}});
   assert.equal(r.status,401);assert.match(r.headers.get('www-authenticate'),/^Basic/);assert.equal(r.headers.get('cache-control'),'no-store');
   assert.ok(!(await r.text()).includes('PRIVATE VIEWER'));
  }
 }
 assert.equal(upstream.length,0);
});
test('an unconfigured private preview remains closed even with a plausible credential',async t=>{
 const {origin}=await setup(t,{enabled:false});
 assert.equal((await fetch(origin+'/jev-test/',{headers:{authorization:auth}})).status,404);
});
test('authorized page/assets are served privately and normal routes remain in maintenance',async t=>{
 const {origin}=await setup(t);
 for(const [path,body]of [['/jev-test/','PRIVATE VIEWER'],['/jev-test/assets/viewer.js','private-script']]){
  const r=await fetch(origin+path,{headers:{authorization:auth}});assert.equal(r.status,200);assert.equal(await r.text(),body);assert.equal(r.headers.get('cache-control'),'no-store');
 }
 for(const path of ['/','/jev/'])assert.equal((await fetch(origin+path,{headers:{authorization:auth}})).status,503);
 const redirect=await fetch(origin+'/jev-test',{headers:{authorization:auth},redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/jev-test/');
});
test('private connector preserves request limits and supplies only its own upstream credential',async t=>{
 const {origin,upstream}=await setup(t);
 const r=await fetch(origin+'/jev-test/__jev/live?sync=1&since=a:b',{headers:{authorization:auth}});
 assert.equal(r.status,200);assert.deepEqual(upstream,[{path:'/__jev/live?sync=1&since=a:b',authorization:'Bearer fixture-upstream-secret'}]);
 assert.equal((await fetch(origin+'/jev-test/__jev/live?url=https://untrusted.invalid',{headers:{authorization:auth}})).status,400);
 assert.equal(upstream.length,1);
});
test('private routes cannot serve traversal, dotfiles or execute write requests',async t=>{
 const {origin,upstream}=await setup(t);
 for(const path of ['/jev-test/%2eenv','/jev-test/%252e%252e/secret','/jev-test/assets/%5c..%5cindex.html','/jev-test/missing.js']){
  assert.equal((await fetch(origin+path,{headers:{authorization:auth}})).status,404);
 }
 assert.equal((await fetch(origin+'/jev-test/',{method:'POST',headers:{authorization:auth},body:'x'})).status,405);
 assert.equal((await fetch(origin+'/jev-test/__jev/live',{method:'DELETE',headers:{authorization:auth}})).status,405);
 assert.equal(upstream.length,0);
});
test('HEAD authenticates identically and returns no HTML body',async t=>{
 const {origin}=await setup(t);
 assert.equal((await fetch(origin+'/jev-test/',{method:'HEAD'})).status,401);
 const r=await fetch(origin+'/jev-test/',{method:'HEAD',headers:{authorization:auth}});
 assert.equal(r.status,200);assert.equal(await r.text(),'');
});
test('all viewer streams stay inside the private prefix while public/local behavior is unchanged',()=>{
 for(const path of ['/__jev/live?sync=1&since=a:b','/__jev/news','/__jev/trading?after=12']){
  assert.equal(jevEndpoint(path,'/jev-test/'),'/jev-test'+path);
  assert.equal(jevEndpoint(path,'/jev-test/index.html'),'/jev-test'+path);
  assert.equal(jevEndpoint(path,'/jev/'),'/jev'+path);
  assert.equal(jevEndpoint(path,'/'),path);
 }
});
