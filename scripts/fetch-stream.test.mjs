import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fetchStream} from '../src/agent-trading/fetch-stream.js';
test('an available response finishes its body after the header budget without restarting the transfer',async()=>{
 const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json','content-length':11});res.flushHeaders();setTimeout(()=>res.end('{"ok":true}'),70);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const result=await fetchStream('http://127.0.0.1:'+server.address().port,{}, {headersMs:50,bodyMs:300});assert.equal(result.text,'{"ok":true}');}
 finally{await new Promise(r=>server.close(r));}
});
test('a body that stops transferring still times out',async()=>{
 const server=createServer((req,res)=>{res.writeHead(200);res.flushHeaders();});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{await assert.rejects(()=>fetchStream('http://127.0.0.1:'+server.address().port,{}, {headersMs:100,bodyMs:30}));}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
