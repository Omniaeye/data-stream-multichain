/** Copyright 2026 OMNIA EYE Corporation. All rights reserved. */
import {createReadStream,existsSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname,resolve,sep} from 'node:path';
import {createConnector} from './src/server/connector.mjs';
const root=resolve('dist'),connector=createConnector(process.env);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
 let url;try{url=new URL(req.url,'http://site');}catch{res.writeHead(400);res.end();return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 if(url.pathname==='/healthz'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end('{"ok":true}');return;}
 if(url.pathname.startsWith('/__jev/'))return connector(req,res,url);
 let path;try{path=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
 let file=resolve(root,'.'+path);
 if(file!==root&&!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}
 if(file===root)file=resolve(root,'index.html');
 if(!existsSync(file)||!statSync(file).isFile()){
  if(!extname(path)&&req.headers.accept?.includes('text/html'))file=resolve(root,'index.html');
  else{res.writeHead(404);res.end();return;}
 }
 res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':file.endsWith('index.html')?'no-cache':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'});
 if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
});
server.listen(Number(process.env.PORT||3000),'::');
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
