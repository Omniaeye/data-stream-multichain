# Live presentation lifecycle

The browser presents recent verified capture fields. It is not the durable ingestion queue. Token eligibility and social publication windows follow wall time; particle journeys use an animation clock.

## Visibility and pause

- Hidden pages stop live polling and discard only undisplayed animation groups. The last verified capture and server-side history remain intact.
- Returning to the page requests the latest capture and resumes from recent source evidence. Receipt IDs still prevent replay within the retained deduplication window.
- Explicit pause retains at most two presentation cycles. Resume selects the newest waiting cycle and distributes its remaining fields across its original duration, preventing a catch-up burst.
- `data-presentation` reports received, shown, superseded and pending animation fields. Superseded fields are not counted as shown. The global counter continues to come from the persisted server ledger.

## Connection recovery

The live session keeps the last verified capture when transport, validation or revision reconciliation fails. Its next request omits the stale revision and asks for a full snapshot. A 304 is accepted only when the client has a valid baseline. Eligibility keeps expiring during unchanged responses.

## Composition

Compact news, source marks, brain and token bounds have separate reserved areas. The token layouts derive their upper bounds from the same brain geometry. The side rail collapses before its reserved width would force the scene into a conflicting breakpoint.

## Validation

`npm test`, `npm run typecheck`, `npm run build`. Regression tests exercise a five-minute pause with continuing captures, background reset, receipt preservation, delta-gap recovery and compact bounds. Production browser checks are recorded separately from deterministic tests.

Browser behavior reference: [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
