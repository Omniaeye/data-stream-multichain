/** © 2026 OMNIA EYE Corporation. All Rights Reserved. */
export function createTradingFeed(){
 let sequence=null,lastReceived=0;const pending=[];
 return {
  receive(snapshot,now=Date.now()){
   if(!Number.isSafeInteger(snapshot.sequence)||!Array.isArray(snapshot.rows)||!Array.isArray(snapshot.events))throw new Error('Invalid trading feed');
   if(sequence!==null&&snapshot.sequence<sequence)throw new Error('Trading journal sequence moved backwards');
   const restore=sequence===null||now-lastReceived>15000||snapshot.sequence-sequence>100;
   if(restore)pending.length=0;
   else for(const event of snapshot.events)if(event.sequence>sequence&&event.kind==='presentation')pending.push(event);
   sequence=snapshot.sequence;lastReceived=now;
   return restore?snapshot.rows.filter(row=>row.kind==='presentation'):null;
  },
  advance(){return pending.splice(0);},
  get sequence(){return sequence??0;},
  get time(){return 0;}
 };
}
