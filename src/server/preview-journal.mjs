/** © 2026 OMNIA EYE Corporation. All Rights Reserved. */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createTradingSession} from '../agent-trading/trading-session.js';

export function openTradingStore(path,{now=Date.now,seed=Date.now()>>>0}={}){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path,{timeout:2000});
 db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS session(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,position_id TEXT NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS positions(id TEXT PRIMARY KEY,seq INTEGER NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL);`);
 const stored=db.prepare('SELECT payload FROM session WHERE id=1').get();
 let session=createTradingSession({seed,startedAt:now(),snapshot:stored?JSON.parse(stored.payload):undefined});
 // Resume the persisted clock. Offline time never produces a burst of invented
 // past events. All connected browsers share this one producer and journal.
 const resumedAt=now(),resumedTime=session.time;
 const save=db.prepare('INSERT INTO session VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload');
 const insert=db.prepare('INSERT INTO events(id,position_id,payload) VALUES(?,?,?)');
 const position=db.prepare('INSERT INTO positions VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET seq=excluded.seq,status=excluded.status,payload=excluded.payload');
 let checkpoint=0;
 function tick(){
  const at=now(),before=session.snapshot(),events=session.advance(resumedTime+Math.max(0,at-resumedAt)/1000,at);
  if(!events.length&&at-checkpoint<1000)return;
  db.exec('BEGIN IMMEDIATE');
  try{
   for(const event of events){const payload=JSON.stringify(event),receipt=insert.run(event.id,event.positionId,payload);position.run(event.positionId,receipt.lastInsertRowid,event.status,payload);}
   save.run(JSON.stringify(session.snapshot()));db.exec('COMMIT');checkpoint=at;
  }catch(error){db.exec('ROLLBACK');session=createTradingSession({snapshot:before});throw error;}
 }
 function read(after=0){
  const sequence=db.prepare('SELECT coalesce(max(seq),0) AS n FROM events').get().n;
  const selected=db.prepare("SELECT payload FROM (SELECT seq,payload FROM positions ORDER BY (status='open') DESC,seq DESC LIMIT 100) ORDER BY seq DESC").all();
  return {sequence,openCount:session.openCount,totalPositions:db.prepare('SELECT count(*) AS n FROM positions').get().n,
   rows:selected.map(r=>JSON.parse(r.payload)),events:db.prepare('SELECT seq,payload FROM events WHERE seq>? ORDER BY seq DESC LIMIT 100').all(after).reverse().map(r=>({...JSON.parse(r.payload),sequence:r.seq})),serverTime:now()};
 }
 tick();return {tick,read,close(){tick();db.close();}};
}
