# Data Contract

## Principle

JEV accepts normalized observations. A field is meaningful only in the context of its token, chain, source path, capture identity, and timestamp.

## Capture envelope

```ts
type CaptureEnvelope = {
  metadata: {
    chain: 'robinhood' | 'bsc' | 'solana';
    capture_id: string;
    raw_sha256: string;
    received_at: string;
    endpoint: string;
  };
  tokens: TokenSnapshot[];
  sources: SourceReference[];
};
```

## Invariants

- `capture_id` identifies the collection event that introduced the record.
- `raw_sha256` binds routed values to the captured payload identity.
- `received_at` records when the normalized capture entered the system.
- `chain` remains explicit for every token and field.
- social references retain their source URL and the capture that surfaced the reference.
- a routed field does not become an assessment, trade, or prediction by being displayed in the field.

## Social-link envelope

The social route carries recent source references associated with a token key. It may contain a profile name, avatar, follower count, post body, canonical URL, media metadata, and source time when those values are supplied by the connector.

Social content is presented as source context. The source link remains available to the reader so the originating publication can be inspected directly.

## Bounded browser contract

The field requests approved same-origin routes:

| Route | Purpose |
| --- | --- |
| `/__jev/live` | normalized multichain capture envelope |
| `/__jev/news` | bounded recent social-link envelope |
| /__jev/trading | persisted trading-preview presentation events |

Connector endpoints remain private configuration. The browser never receives connector credentials or direct provider access.

## Paged live delivery — private deployment

The sync=1 live endpoint accepts the last verified combined revision in since. It returns the next retained page, represented as a snapshot or delta, rather than jumping directly to the newest publication. A page contains at most six source batches. The snapshot's token roster is still complete; byte-size reduction is a separate pending stage.

The combined capture's optional delivery object contains epoch, sequence, publication, sourceRevision, page and pages. Transport captureId/captureHash identify that page; they do not replace nested raw capture IDs, hashes or receipt timestamps.

An envelope also supplies recovery.status: initial, continuous or reset. Reset reasons are cursor_expired and history_incomplete. These describe bounded in-memory delivery history, not deletion from the durable raw archive. Consumers must validate sequence, keep their last verified baseline on failure and never infer source freshness from an HTTP success alone.

During the protected online test, these routes are prefixed with /jev-test. Authentication is checked before proxying; upstream gateway credentials stay on the server. This is the same real data backend, not a synthetic feed or a separate trading environment.
