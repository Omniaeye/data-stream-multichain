/** © 2026 OMNIA EYE Corporation. All Rights Reserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createTradingSession,mergeTradingRow} from '../src/agent-trading/trading-session.js';
import {createTradingFeed} from '../src/agent-trading/trading-feed.js';
import {tradingPulseCycle} from '../src/agent-trading/trading-pulses.js';
import {openTradingStore} from '../src/server/preview-journal.mjs';


test('reopened session keeps RNG, IDs, open paths and exact next action',()=>{
 const running=createTradingSession({seed:912,startedAt:0});running.advance(311);
 const recovered=createTradingSession({snapshot:JSON.parse(JSON.stringify(running.snapshot()))});
 assert.deepEqual(recovered.advance(5000),running.advance(5000));
 assert.throws(()=>createTradingSession({snapshot:{version:0}}),/preserve stored state/);
});
test('SQLite survives restart and retains complete journal beyond the 100-row viewport',()=>{
 const directory=mkdtempSync(join(tmpdir(),'jev-journal-')),path=join(directory,'test.sqlite');let clock=100000,store;
 try{
  store=openTradingStore(path,{now:()=>clock,seed:711});clock+=3000000;store.tick();
  const before=store.read();assert.equal(before.sequence,700);assert.equal(before.rows.length,100);assert.ok(before.totalPositions>100);assert.ok(before.openCount<=10);
  const closed=before.rows.find(row=>row.status==='closed');assert.ok(closed);
  store.close();clock+=86400000;store=openTradingStore(path,{now:()=>clock,seed:9});
  assert.deepEqual(store.read().rows,before.rows);assert.equal(store.read().sequence,before.sequence);
  clock+=30000;store.tick();const after=store.read(before.sequence);assert.equal(after.sequence,before.sequence+7);assert.equal(after.events.length,7);
  assert.ok(after.events.every(e=>e.at>clock-30001&&e.kind==='presentation'));
  const db=new DatabaseSync(path,{readOnly:true});try{
   assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,707);
   assert.equal(JSON.parse(db.prepare('SELECT payload FROM positions WHERE id=?').get(closed.positionId).payload).multiple,closed.multiple);
  }finally{db.close();}
 }finally{store?.close();rmSync(directory,{recursive:true,force:true});}
});
test('browser reload restores rows without reissuing BUY or rewinding multiples',()=>{
 const session=createTradingSession({seed:77,startedAt:0});const generated=session.advance(900);let rows=[];for(const e of generated)rows=mergeTradingRow(rows,e);
 const snapshot={sequence:generated.length,rows,events:generated.map((e,i)=>({...e,sequence:i+1}))};
 const feed=createTradingFeed();assert.deepEqual(feed.receive(snapshot,1000),rows);assert.deepEqual(feed.advance(),[]);
 assert.equal(feed.receive(snapshot,2000),null);assert.deepEqual(feed.advance(),[]);
 const events=session.advance(930).map((e,i)=>({...e,sequence:snapshot.sequence+i+1}));
 feed.receive({...snapshot,sequence:snapshot.sequence+7,events},3000);assert.equal(feed.advance().length,7);assert.equal(feed.advance().length,0);
 assert.throws(()=>feed.receive(snapshot,4000),/backwards/);
 const latest=rows.find(e=>e.action==='HOLD');assert.ok(latest);assert.equal(mergeTradingRow(rows,{...latest,id:'older',at:latest.at-1,multiple:1}),rows);
});
test('failed journal transaction restores the decision cursor before retry',()=>{
 const directory=mkdtempSync(join(tmpdir(),'jev-rollback-')),path=join(directory,'test.sqlite');let clock=100000;
 const store=openTradingStore(path,{now:()=>clock,seed:741}),db=new DatabaseSync(path);
 try{
  db.exec("CREATE TRIGGER reject_event BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  clock+=30000;assert.throws(()=>store.tick(),/test failure/);assert.equal(store.read().sequence,0);
  db.exec('DROP TRIGGER reject_event');store.tick();assert.equal(store.read().sequence,7);
  assert.equal(store.read().events[0].reference,'000001');
 }finally{db.close();store.close();rmSync(directory,{recursive:true,force:true});}
});
test('random timing contains meaningful long and short intervals, with no overlap',()=>{
 const intervals=[];for(let c=0;c<100;c++){const p=tradingPulseCycle(c);for(let i=1;i<p.length;i++)intervals.push(p[i].at-p[i-1].at);}
 assert.ok(Math.min(...intervals)<3.1);assert.ok(Math.max(...intervals)>6);
});
