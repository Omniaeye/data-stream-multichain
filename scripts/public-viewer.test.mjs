import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createViewer,createPrivatePreview} from '../src/server/private-preview.mjs';

test('public JEV and its data load anonymously while the private route remains protected',async t=>{
 const root=await mkdtemp(join(tmpdir(),'jev-public-'));
 await mkdir(join(root,'assets'));await writeFile(join(root,'index.html'),'APP');
 await writeFile(join(root,'assets','app-abcdefgh.js'),'export const realApp=true;');
 const seen=[],connector=async(req,res,url)=>{seen.push(url.pathname+url.search);res.writeHead(200,{'cache-control':'no-store'});res.end('{"ok":true}');};
 const pub=createViewer({root,connector,prefix:'/jev',privateAccess:false});
 const trenches=createViewer({root,connector,prefix:'/trenches',privateAccess:false});
 const priv=createPrivatePreview({root,connector,env:{JEV_TEST_AUTH_SHA256:createHash('sha256').update('test:fixture').digest('hex')}});
 const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(await priv(req,res,url)||await pub(req,res,url)||await trenches(req,res,url))return;res.writeHead(404);res.end();});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port;
 for(const path of ['/jev/','/jev/index.html','/trenches/','/trenches/index.html']){const r=await fetch(origin+path);assert.equal(r.status,200);assert.equal(await r.text(),'APP');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('www-authenticate'),null);}
 const asset=await fetch(origin+'/jev/assets/app-abcdefgh.js',{headers:{'accept-encoding':'gzip'}});assert.equal(asset.status,200);assert.equal(asset.headers.get('content-encoding'),'gzip');assert.equal(asset.headers.get('cache-control'),'public, max-age=31536000, immutable');
 assert.equal((await fetch(origin+'/jev/assets/app-abcdefgh.js',{headers:{'if-none-match':asset.headers.get('etag')}})).status,304);
 for(const path of ['/jev-test/','/jev-test/assets/app-abcdefgh.js','/jev-test/__jev/live'])assert.equal((await fetch(origin+path)).status,401);
 for(const path of ['/jev/__jev/bootstrap','/jev/__jev/live?sync=1&wire=1','/trenches/__jev/bootstrap','/trenches/__jev/news','/trenches/__jev/live?sync=1&wire=1'])assert.equal((await fetch(origin+path)).status,200);
 assert.deepEqual(seen,['/__jev/bootstrap','/__jev/live?sync=1&wire=1','/__jev/bootstrap','/__jev/news','/__jev/live?sync=1&wire=1']);
 assert.equal((await fetch(origin+'/jev/',{method:'POST'})).status,405);
 assert.equal((await fetch(origin+'/trenches/__jev/news',{method:'POST'})).status,405);
 assert.equal((await fetch(origin+'/trenches/%2eenv')).status,404);
 assert.equal((await fetch(origin+'/jev/%2eenv')).status,404);
 assert.equal((await fetch(origin+'/jev/missing.js')).status,404);
 const redirect=await fetch(origin+'/jev',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/jev/');
 const trRedirect=await fetch(origin+'/trenches',{redirect:'manual'});assert.equal(trRedirect.status,308);assert.equal(trRedirect.headers.get('location'),'/trenches/');
});
