import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveSession,revisionOf} from '../src/agent-trading/live-sync.js';
const epoch='00000000-0000-4000-8000-000000000001';
const page=(sequence,{status='continuous',reason}={})=>({
 kind:'snapshot',revision:'stream-'+epoch+'-'+sequence+':hash-'+sequence,
 capture:{mode:'live',captureId:'stream-'+epoch+'-'+sequence,captureHash:'hash-'+sequence,tokens:[],batches:[],delivery:{epoch,sequence,publication:1,sourceRevision:'source:hash',page:sequence,pages:5}},
 recovery:{status,...(reason?{reason}:{})}
});
test('an out-of-order snapshot cannot silently skip a retained delivery sequence',()=>{
 const s=createLiveSession();const a=s.accept(200,page(1,{status:'initial'}));
 assert.throws(()=>s.accept(200,page(3)),/Delivery gap/);
 assert.equal(s.current(),a);
});
test('a cursor reset is accepted only with an explicit supported reason',()=>{
 const s=createLiveSession();s.accept(200,page(1,{status:'initial'}));
 assert.throws(()=>s.accept(200,page(5,{status:'reset'})),/recovery/);
 const next=s.accept(200,page(5,{status:'reset',reason:'cursor_expired'}));
 assert.equal(next.delivery.sequence,5);
 assert.deepEqual(s.recovery(),{status:'reset',reason:'cursor_expired'});
});
test('malformed page metadata does not replace the last verified capture',()=>{
 const s=createLiveSession(),a=s.accept(200,page(1,{status:'initial'}));
 const invalid=page(2);invalid.capture.delivery.page=6;
 assert.throws(()=>s.accept(200,invalid),/delivery/);assert.equal(s.current(),a);
});
test('legacy snapshots and sequential pages remain compatible, including unchanged responses',()=>{
 const s=createLiveSession(),legacy={mode:'live',captureId:'old',captureHash:'old',tokens:[]};
 s.accept(200,{kind:'snapshot',revision:revisionOf(legacy),capture:legacy});
 s.accept(200,page(1,{status:'reset',reason:'cursor_expired'}));
 const b=s.accept(200,page(2));assert.equal(s.accept(304),b);assert.equal(s.revision(),revisionOf(b));
});
