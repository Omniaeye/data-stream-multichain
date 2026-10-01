# Live presentation lifecycle

The browser presents recent verified capture fields. It is not the durable ingestion queue. Token eligibility and social publication windows follow wall time; particle journeys use an animation clock.

## Visibility and pause

- Hidden pages stop live polling and discard only undisplayed animation groups. The last verified capture and server-side history remain intact.
- Returning to the page requests the next retained page after its verified cursor and resumes from recent source evidence. Receipt IDs still prevent replay within the retained deduplication window.
- Explicit pause retains at most two presentation cycles. Resume selects the newest waiting cycle and distributes its remaining fields across its original duration, preventing a catch-up burst.
- `data-presentation` reports received, shown, superseded and pending animation fields. Superseded fields are not counted as shown. The global counter continues to come from the persisted server ledger.

## Connection recovery

The live session keeps the last verified capture when transport, validation or revision reconciliation fails. Transport failures keep the last verified cursor for retry. Validation or reconciliation failures omit the cursor on the next request and ask for a full snapshot. A 304 is accepted only when the client has a valid baseline. Eligibility keeps expiring during unchanged responses.

## Composition

Compact news, source marks, brain and token bounds have separate reserved areas. The token layouts derive their upper bounds from the same brain geometry. The side rail collapses before its reserved width would force the scene into a conflicting breakpoint.

## Validation

`npm test`, `npm run typecheck`, `npm run build`. Regression tests exercise a five-minute pause with continuing captures, background reset, receipt preservation, delta-gap recovery and compact bounds. Production browser checks are recorded separately from deterministic tests.

Browser behavior reference: [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

## Recovery and overlapping cadence — private deployment, 2026-09-28

Late server releases now have a full 15-second presentation window and may overlap. Counters add each active increment instead of jumping to the previous target. These server changes are deployed to the Core used by the private test.

The renderer now recovers independently from the data session. Exceptions, backend/device/context loss, stalled successful frames and incomplete initialization rebuild its graphics resources. Retries use bounded exponential delays; repeated failures select WebGL2. Delayed callbacks from older instances are ignored.

The existing bounded pacer waits while the scene is unavailable. Received fields and the global ledger are not reset. In-flight visual clouds may disappear during reconstruction; already presented fields are not replayed.

Hidden/paused pages and delayed watchdog timers are not automatically treated as renderer failure. Recovery cannot operate while the JavaScript thread itself remains suspended.

Validation: 29 automated tests, typecheck, build, local Chrome fault injection, context/device loss, fallback, delayed initialization, controls during recovery, explicit pause, six-second JavaScript blocking and a no-fault flow check. CDP freezing did not produce lifecycle events in this environment; physical device/system suspension and prolonged live operation remain unverified.

These changes are deployed for the private test. Public maintenance remains enabled. Payload size and delivery latency still require the next stages; bounded batch continuity is addressed below.

## Sequential delivery — private deployment, 2026-09-28

The existing revision is also the cursor for the next retained page. The server sends at most six source batches per page while the client retains its 18-batch defensive ceiling. Each page has its own transport identity and sequence; nested source evidence remains unchanged. The first request starts at the latest publication, not the full historical archive.

The client verifies delivery sequence and accepts a reset only with an explicit recovery reason. HTTP failures retain the last verified cursor; invalid envelopes preserve the last scene and trigger snapshot recovery. The browser reuses the returned ETag. A 304 cannot suppress an available next page.

Server history is bounded by page count, serialized size and age. Expiry or restart requires a reset; it is not a promise to recover an unlimited interval. Reset metadata is available in the protocol/session, not a new user-facing gap history.

Validation: 33 visualizer tests, typecheck/build and two real Chrome scenarios with synthetic captures passed. The no-fault burst delivered and displayed all 600 fields across 24 batches. The 503/recovery scenario delivered all 900 fields across 36 batches: 441 shown and 459 superseded by the existing two-window visual queue, with zero pending. Superseded fields are not reported as shown.

These changes are deployed for the private test. Public maintenance is still enabled. The next stage must reduce the full token snapshot and test slow-network progress; batch-count pagination alone does not bound response bytes.

## Protected online test

The private browser at /jev-test/ requests /jev-test/__jev/live, news and trading through the authenticated handler. Public maintenance is preserved. See MAINTENANCE.md for build and access behavior and artifacts/jev-private-live-20260928/ for actual online verification. Synthetic regressions above do not establish sustained production stability.

## Current release and smooth token placement — 2026-09-28

The earlier maintenance statements above describe earlier releases. The approved JEV is now public at `/jev/`. The smooth-placement candidate is deployed only at authenticated `/jev-test/`; the public compiled assets are preserved byte-for-byte. Trenches remains a development-only workspace.

The first rendered roster uses its packed positions immediately. Later identities retain their current positions while moving towards new targets. Waiting/holding MOMENTUM items do not occupy invisible field columns; they join the packing on departure. The field distributes available space and keeps caption space stable when NEW expires. Older tokens remain in the horizontal timeline when newer tokens take the visible area.

Moving nuclei also move existing observation destinations in the GPU route buffer. This never changes birth time, source, category, or delivery counters and never re-ingests fields. Network interruptions preserve the last accepted roster; continued particle flow still requires real observations.

The candidate passed 56 tests, typecheck/build and desktop/mobile browser replays with synthetic arrivals, pause/resume, mode changes and resize. Current deployment, live-browser evidence and remaining server timing limits are recorded in `C:/Users/PC/Desktop/ArbitrageStocks/artifacts/jev-smooth-field-20260928/REPORT.md`. Short successful runs are not an uptime guarantee.


## Public promotion — 2026-09-28

The user approved promotion of the smooth-placement candidate to `/jev/`. Viewer deployment `12b704c1-61e9-4ab3-b8a8-3391c65d3dd5` is SUCCESS. Public and private builds now use the same approved source. Trenches remains local only. Promotion evidence: `C:/Users/PC/Desktop/ArbitrageStocks/artifacts/jev-smooth-public-20260928/REPORT.md`. The earlier private-only release boundary is superseded by this explicit approval; performance and provider-image limitations remain unchanged.


## News inspection preserves the view — 2026-09-28

Published viewer `ef1bebf7-9237-4551-ae32-54585b543ef6`. A news chip selects chain + contract without changing Trending/Global. Pinned inspection survives scene ineligibility and retains the selected token snapshot and originating story; it follows a visible bubble or falls back to the source chip/last anchor. Both chips and Social Trace use the same captured content references. Profile-only association stays excluded. Manual view changes retain inspection. Seven implementation/test files changed from the approved smooth-placement release. 57 tests, typecheck/build, synthetic desktop/mobile replays, 16 public real-data clicks, runtime/HTTP checks and a short live-flow regression passed. Evidence and limitations: `C:/Users/PC/Desktop/ArbitrageStocks/artifacts/jev-news-selection-20260928/REPORT.md`. Trenches remains local; no backend or financial activation in this task.
