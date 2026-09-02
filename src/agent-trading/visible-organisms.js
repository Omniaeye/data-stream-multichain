// A dense render index, separate from the complete observation ledger.
// Changing a filter preserves birth time, route and evidence; it never re-ingests.
export function createVisibleOrganisms(){
 const records=[],indices=new Map(),births=[];
 return {
  records,
  indexOf(id){return indices.get(id)??-1;},
  sync(slots,keys,write){
   const eligible=new Map(slots.filter(r=>r&&keys.has(r.datum.tokenKey)).map(r=>[r.datum.id,r]));
   let dirty=false;
   for(let i=records.length-1;i>=0;i--){
    if(eligible.has(records[i].datum.id))continue;
    indices.delete(records[i].datum.id);const last=records.pop(),birth=births.pop();dirty=true;
    if(i<records.length){records[i]=last;births[i]=birth;indices.set(last.datum.id,i);write(last,i);}
   }
   for(const record of eligible.values()){
    let index=indices.get(record.datum.id);
    if(index===undefined){index=records.length;indices.set(record.datum.id,index);records.push(record);births.push(record.birth);write(record,index);dirty=true;}
    else if(births[index]!==record.birth){births[index]=record.birth;write(record,index);dirty=true;}
   }
   return dirty;
  }
 };
}
