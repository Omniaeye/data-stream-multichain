# JEV Neural Data Stream

A multichain observatory that routes normalized token, market, and social observations into a living Three.js field.

```text
connectors -> normalized captures -> stream cache -> neural routing -> token universe
```

Three network lanes — Robinhood Chain, BSC, and Solana — converge into JEV Neural. Token identity, source links, capture timestamps, and source-provided market fields stay separate throughout the pipeline.

## Included

- React, TypeScript, Vite, and Three.js client.
- Network counters, routed particles, market-cap-scaled organisms, and social trace.
- JEV Neural routing sculpture with seven time-spread labels per 30-second cycle.
- Native Node delivery service with health checks and bounded connector passthroughs.

## Local run

```bash
npm install
npm run dev
```

For a production-shaped local run:

```bash
npm run build
npm start
```

## Connector contract

Set `DATA_STREAM_UPSTREAM` to an internal endpoint returning the normalized capture envelope consumed by `GET /__jev/live`. Set `NEWS_STREAM_UPSTREAM` for the bounded recent social-link response served at `GET /__jev/news`.

The browser never requests providers directly. Connector implementations own authentication, rate limits, ingestion, and normalization outside the browser boundary.

## Railway

Railway builds with `npm run build` and starts with `npm start`.

- `GET /healthz` — process health.
- `GET /__jev/live` — bounded capture passthrough.
- `GET /__jev/news` — bounded recent social-link passthrough.

Configure private upstreams as Railway variables. Do not commit credentials, private endpoints, raw captures, or local SQLite files.

## Validation

```bash
npm run test
npm run typecheck
npm run build
```

The pulse test verifies seven labels per 30-second cycle with space between events. It does not evaluate market outcomes or place orders.

## License

Proprietary — OMNIA EYE.
