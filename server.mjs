/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import {createReadStream,existsSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname,resolve,sep} from 'node:path';
import {createConnector} from './src/server/connector.mjs';
import {createPrivatePreview,createViewer} from './src/server/private-preview.mjs';
const root=resolve('dist'),connector=createConnector(process.env),privatePreview=createPrivatePreview({connector}),publicViewer=createViewer({root:resolve('public-dist'),prefix:'/jev',privateAccess:false,connector});
const trenchesViewer=createViewer({root:resolve('public-dist'),prefix:'/trenches',privateAccess:false,connector});
const warm=setInterval(()=>void connector.warm().catch(()=>{}),15000);warm.unref();void connector.warm().catch(()=>{});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
 let url;try{url=new URL(req.url,'http://site');}catch{res.writeHead(400);res.end();return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 if(url.pathname==='/healthz'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end('{"ok":true}');return;}
 if(await privatePreview(req,res,url))return;
 if(await publicViewer(req,res,url))return;
 if(await trenchesViewer(req,res,url))return;
 if(url.pathname==='/'){res.writeHead(307,{location:'/jev/','cache-control':'no-store'});res.end();return;}
 if(url.pathname.startsWith('/__jev/'))return connector(req,res,url);
 let path;try{path=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
 let file=resolve(root,'.'+path);
 if(file!==root&&!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}
 if(file===root||(existsSync(file)&&statSync(file).isDirectory()))file=resolve(file,'index.html');
 if(!existsSync(file)||!statSync(file).isFile()){
  if(!extname(path)&&req.headers.accept?.includes('text/html'))file=resolve(root,'index.html');
  else{res.writeHead(404);res.end();return;}
 }
 // The public maintenance file gates HTML only; connectors and health checks keep their existing behavior.
 const maintenanceFile=resolve(root,'maintenance/index.html');
 const maintenance=extname(file)==='.html'&&existsSync(maintenanceFile);
 if(maintenance)file=maintenanceFile;
 res.writeHead(maintenance?503:200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':maintenance?'no-store':file.endsWith('index.html')?'no-cache':'public, max-age=31536000, immutable','x-content-type-options':'nosniff',...(maintenance?{'x-robots-tag':'noindex, nofollow'}:{})});
 if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
});
server.listen(Number(process.env.PORT||3000),'::');
process.on('SIGTERM',()=>{clearInterval(warm);server.close(()=>process.exit(0));});
