/** Â© 2026 OMNIA EYE Corporation. All Rights Reserved. */
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
 CREATE TABLE IF NOT EXISTS positions(id TEXT PRIMARY KEY,seq INTEGER NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS positions_read_idx ON positions((status='open') DESC,seq DESC);`);
 const stored=db.prepare('SELECT payload FROM session WHERE id=1').get();
 let session=createTradingSession({seed,startedAt:now(),snapshot:stored?JSON.parse(stored.payload):undefined});
 // All browsers read one producer. Offline time never invents past events.
 const resumedAt=now(),resumedTime=session.time;
 const save=db.prepare('INSERT INTO session VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload');
 const insert=db.prepare('INSERT INTO events(id,position_id,payload) VALUES(?,?,?)');
 const position=db.prepare('INSERT INTO positions VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET seq=excluded.seq,status=excluded.status,payload=excluded.payload');
 const exists=db.prepare('SELECT 1 FROM positions WHERE id=?');
 const selected=db.prepare("SELECT payload FROM (SELECT seq,payload FROM positions ORDER BY (status='open') DESC,seq DESC LIMIT 100) ORDER BY seq DESC");
 // The SQL contract returns the latest 100 matching events. The latest 100
 // globally contain that exact result for every cursor, including old cursors.
 let snapshot={sequence:db.prepare('SELECT coalesce(max(seq),0) AS n FROM events').get().n,
  openCount:session.openCount,totalPositions:db.prepare('SELECT count(*) AS n FROM positions').get().n,
  rows:selected.all().map(r=>JSON.parse(r.payload)),
  events:db.prepare('SELECT seq,payload FROM events ORDER BY seq DESC LIMIT 100').all().reverse().map(r=>({...JSON.parse(r.payload),sequence:r.seq}))};
 let checkpoint=0;
 function tick(){
  const at=now(),before=session.snapshot(),events=session.advance(resumedTime+Math.max(0,at-resumedAt)/1000,at);
  if(!events.length&&at-checkpoint<1000)return;
  let next=snapshot,began=false;
  try{
   db.exec('BEGIN IMMEDIATE');began=true;
   let added=0;const journal=[];
   for(const event of events){
    const payload=JSON.stringify(event),receipt=insert.run(event.id,event.positionId,payload);
    if(!exists.get(event.positionId))added++;
    position.run(event.positionId,receipt.lastInsertRowid,event.status,payload);
    journal.push({...event,sequence:Number(receipt.lastInsertRowid)});
   }
   save.run(JSON.stringify(session.snapshot()));
   if(journal.length)next={sequence:journal.at(-1).sequence,openCount:session.openCount,
    totalPositions:snapshot.totalPositions+added,rows:selected.all().map(r=>JSON.parse(r.payload)),
    events:[...snapshot.events,...journal].slice(-100)};
   db.exec('COMMIT');began=false;checkpoint=at;snapshot=next;
  }catch(error){
   if(began){try{db.exec('ROLLBACK');}catch{}}
   session=createTradingSession({snapshot:before});throw error;
  }
 }
 function read(after=0){
  if(!Number.isSafeInteger(after)||after<0)throw new RangeError('Invalid journal cursor');
  // No SQLite work on the request path. A failed transaction cannot publish
  // partial rows: the snapshot changes only after the commit succeeds.
  return structuredClone({...snapshot,events:snapshot.events.filter(r=>r.sequence>after),serverTime:now()});
 }
 tick();return {tick,read,close(){tick();db.close();}};
}