// Each source field owns one cloud for its entire visual journey.
// The window bounds GPU memory only. Source captures are never deleted.
export const ORGANISM_LIMIT = 32768;
export const PARTICLES_PER_ORGANISM = 4;
export const JOURNEY_SECONDS = 3.2;
export const RESIDENCE_SECONDS = 3;
export const RESIDENT_FADE_SECONDS = .6;

export function observationSeed(id) {
 let value = 2166136261;
 for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619);
 return (value >>> 0) / 4294967296;
}

export function organismStage(record, time) {
 if (record.slot < 0 || time < record.birth) return 'queued';
 const progress = (time - record.birth) / JOURNEY_SECONDS;
 return progress < .36 ? 'entering' : progress < .53 ? 'brain' : progress < 1 ? 'outbound' : 'resident';
}

export function createOrganismStore(visibleKeys, capacity = ORGANISM_LIMIT, {residenceSeconds=Infinity,pacedSpreadSeconds=0}={}) {
 const visible = new Set(visibleKeys), byId = new Map(), slots = [], queue = [], residents = [];
 const freeSlots=[],expires=Number.isFinite(residenceSeconds);
 const seen = new Map(), zoneTotals = {};
 let head = 0, residentHead = 0;
 const totals = {received:0, delivered:0, retired:0, visible:0, other:0, changed:0, unverified:0};
 return {
  slots, zoneTotals,
  setVisibleKeys(keys){visible.clear();keys.forEach(key=>visible.add(key));},
  ingest(route) {
   totals.unverified += route.unverified ?? 0;
   for (const datum of route.rows) {
    let capture = seen.get(datum.captureId);
    if (!capture) {
     capture = new Set(); seen.set(datum.captureId, capture);
     // The upstream contract also rejects older/replayed captures per token.
     if (seen.size > 32) seen.delete(seen.keys().next().value);
    }
    if (capture.has(datum.id)) continue;
    capture.add(datum.id);
    const record = {datum, slot:-1, birth:Infinity, seed:observationSeed(datum.id), completed:false,paced:!!route.paced};
    byId.set(datum.id, record); queue.push(record);
    totals.received++; totals.changed += Number(datum.changed);
    totals[visible.has(datum.tokenKey) ? 'visible' : 'other']++;
    zoneTotals[datum.zone] = (zoneTotals[datum.zone] ?? 0) + 1;
   }
  },
  advance(time, settled = false) {
   const admitted = [];
   // Reduced motion has no advancing animation clock. Reuse its completed
   // static window under pressure instead of waiting forever for a fade timer.
   const replaceSettled=settled&&head<queue.length&&freeSlots.length===0&&slots.length>=capacity;
   if (settled) for (const record of slots) if (record&&!record.completed) {
    record.birth = time - JOURNEY_SECONDS; admitted.push(record);
   }
   for (const record of slots) if (record) {
    if(!record.completed && organismStage(record,time)==='resident'){
     record.completed=true;if(!expires)residents.push(record.slot);totals.delivered++;
    }
    if(expires&&(time-record.birth>=JOURNEY_SECONDS+residenceSeconds||replaceSettled&&record.completed)){
     byId.delete(record.datum.id);slots[record.slot]=null;freeSlots.push(record.slot);totals.retired++;
    }
   }
   while (head < queue.length) {
    let slot;
    if (freeSlots.length) slot=freeSlots.pop();
    else if (slots.length < capacity) slot = slots.length;
    else if (residentHead < residents.length) {
     slot = residents[residentHead++];
     byId.delete(slots[slot].datum.id); totals.retired++;
    } else break; // Never recycle an organism before it reaches its token.
    const record = queue[head++];
    record.slot = slot;
    // Spacing is presentation time; original receivedAt remains untouched.
    record.birth = settled ? time - JOURNEY_SECONDS : time + record.seed * (record.paced?pacedSpreadSeconds:6);
    slots[slot] = record; admitted.push(record);
   }
   if (head > 8192) { queue.splice(0, head); head = 0; }
   if (residentHead > 8192) { residents.splice(0, residentHead); residentHead = 0; }
   return admitted;
  },
  get(id) { return byId.get(id) ?? null; },
  stats(time) {
   let inFlight = 0, waiting = queue.length - head, resident = 0;
   let retained=0;
   for (const record of slots) {if(!record)continue;retained++;
    const stage = organismStage(record, time);
    if (stage === 'queued') waiting++;
    else if (stage === 'resident') resident++;
    else inFlight++;
   }
   return {...totals, inFlight, pending:waiting, resident, retained, capacity};
  }
 };
}
