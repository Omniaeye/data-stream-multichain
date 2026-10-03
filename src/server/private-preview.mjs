/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import {createHash,timingSafeEqual} from 'node:crypto';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {extname,resolve,sep} from 'node:path';

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.ico':'image/x-icon'};
export function createViewer({root=resolve('test-dist'),env=process.env,connector,prefix='/jev-test',privateAccess=true}={}){
 const expected=/^[a-f0-9]{64}$/.test(env.JEV_TEST_AUTH_SHA256??'')?Buffer.from(env.JEV_TEST_AUTH_SHA256,'hex'):null;
 const directory=resolve(root);
 const assets=new Map();let assetBytes=0;
 return async(req,res,url)=>{
  if(url.pathname!==prefix&&!url.pathname.startsWith(prefix+'/'))return false;
  const headers={'cache-control':'no-store',...(privateAccess?{'x-robots-tag':'noindex, nofollow'}:{}),'x-content-type-options':'nosniff','referrer-policy':'no-referrer',...(privateAccess?{vary:'Authorization'}:{})};
  function reply(status,body,extra={}){res.writeHead(status,{...headers,'content-type':'text/plain; charset=utf-8',...extra});res.end(req.method==='HEAD'?undefined:body);return true;}
  if(!['GET','HEAD'].includes(req.method))return reply(405,'Method not allowed');
  if(privateAccess&&!expected)return reply(404,'Not found');
  const authorization=req.headers.authorization??'';
  let verified=false;
  if(privateAccess&&expected&&typeof authorization==='string'&&authorization.length<=512&&/^Basic [A-Za-z0-9+/]+={0,2}$/i.test(authorization)){
   const decoded=Buffer.from(authorization.slice(6),'base64');
   verified=timingSafeEqual(createHash('sha256').update(decoded).digest(),expected);
  }
  if(privateAccess&&!verified)return reply(401,'Private JEV test. Sign in to continue.',{'www-authenticate':'Basic realm="JEV private test", charset="UTF-8"'});
  if(url.pathname===prefix)return reply(308,'',{'location':prefix+'/'});
  const relative=url.pathname.slice(prefix.length);
  if(relative.startsWith('/__jev/')){
   if(privateAccess)res.setHeader('X-Robots-Tag','noindex, nofollow');
   // The connector supplies its own gateway credential, never the browser's.
   await connector(req,res,new URL(relative+url.search,url));return true;
  }
  let decoded;try{decoded=decodeURIComponent(relative);}catch{return reply(400,'Invalid path');}
  if(decoded.includes('\\')||decoded.split('/').some(part=>part.startsWith('.')))return reply(404,'Not found');
  const file=resolve(directory,'.'+(decoded==='/'?'/index.html':decoded));
  if(!file.startsWith(directory+sep)||!types[extname(file)]||!existsSync(file)||!statSync(file).isFile())return reply(404,'Not found');
  const stat=statSync(file);let item=assets.get(file);
  if(!item||item.mtime!==stat.mtimeMs){
   const body=readFileSync(file),compressed=/\.(js|css|html|svg)$/.test(file)?gzipSync(body,{level:6}):null;
   item={body,compressed,mtime:stat.mtimeMs,etag:'W/"'+createHash('sha256').update(body).digest('hex')+'"'};
   if(assetBytes>16*1024*1024){assets.clear();assetBytes=0;}
   assets.set(file,item);assetBytes+=body.length+(compressed?.length??0);
  }
  const gzip=item.compressed&&/\bgzip\b/.test(req.headers['accept-encoding']??'');
  const body=gzip?item.compressed:item.body;
  const versioned=extname(file)!=='.html'&&/[-.][\w-]{8,}\.[a-z0-9]+$/.test(file);
  const output={...headers,'content-type':types[extname(file)],'cache-control':versioned?(privateAccess?'private':'public')+', max-age=31536000, immutable':'no-store',vary:privateAccess?'Authorization, Accept-Encoding':'Accept-Encoding',etag:item.etag,...(gzip?{'content-encoding':'gzip'}:{})};
  if(versioned&&req.headers['if-none-match']===item.etag){res.writeHead(304,output);res.end();return true;}
  res.writeHead(200,{...output,'content-length':body.length});res.end(req.method==='HEAD'?undefined:body);
  return true;
 };
}

// Keep the existing private-handler interface for tests and callers.
export const createPrivatePreview=createViewer;
