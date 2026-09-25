<a id="readme-top"></a>

<p align="center">
  <img src="public/brand/omnia-eye.png" width="84" alt="OMNIA EYE" />
</p>

<h1 align="center">JEV Neural Data Stream</h1>

<p align="center">
  <strong>Multichain intelligence infrastructure for the OMNIA EYE field.</strong><br />
  A traceable path from network observation to visual context.
</p>

<p align="center">
  <a href="#architecture">Architecture</a> ·
  <a href="#intelligence-field">Intelligence field</a> ·
  <a href="#engineering">Engineering</a> ·
  <a href="#documentation">Documentation</a>
</p>

---

## The field

JEV Neural Data Stream is the intelligence surface behind OMNIA EYE’s multichain observatory. It converts normalized network observations and linked social context into a living Three.js field where movement, proximity, scale, and traceability carry meaning.

The system is designed around a simple principle: an observation should remain attributable as it moves from capture to context. Token identity, market fields, source links, capture time, and evidence references retain distinct roles throughout the route.

```text
NETWORK SIGNALS
      │
      ▼
CAPTURE ADAPTERS ──► NORMALIZATION ──► EVIDENCE ENVELOPE
                                                │
                                                ▼
SOCIAL CONTEXT ◄── LINK RESOLUTION ◄── JEV NEURAL ROUTING
                                                │
                                                ▼
                                  OMNIA EYE INTELLIGENCE FIELD
```

## Architecture

JEV is organized as a set of explicit boundaries rather than a visual layer that guesses at data.

| Layer | Responsibility |
| --- | --- |
| **Network lanes** | Preserve the chain identity of Robinhood Chain, BSC, and Solana observations. |
| **Normalization** | Convert incoming records into a stable token and field shape. |
| **Evidence envelope** | Keep capture identity, capture hash, timestamps, and source paths attached to the observation. |
| **Neural routing** | Classify fields into interpretable zones and route changes through the field. |
| **Social trace** | Resolve captured links into token-level context while retaining the originating reference. |
| **Intelligence field** | Present an interactive spatial view where organism scale follows market-cap bands and tracked social context is visible. |

The browser is intentionally a presentation boundary. Collection, authorization, rate control, and source-specific normalization belong to the connector boundary outside the field.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Intelligence field

The interface treats the field as an instrument panel, not a decorative chart.

- **Neural organism** — a routing sculpture that groups fields such as market, holders, lifecycle, risk, and social context.
- **Multichain lanes** — chain-colored streams carry observations from their network boundary into JEV.
- **Token universe** — organisms are positioned in temporal order, scaled across distinct market-cap bands, and retain their token identity.
- **Social trace** — tracked social references resolve into compact source context, profile identity, follower count where supplied, and original links.
- **Continuous motion** — particles flow continuously through the field; state transitions appear as deliberate, time-spread pulses.
- **Decision vocabulary** — JEV labels operations such as `BUY`, `SKIP`, `HOLD`, `HOLD MOONBAG`, `PROFIT`, `TP1`–`TP5`, and `SL` as interface language. These labels are not trading instructions.

## Engineering

The repository is deliberately compact and readable:

```text
src/
├── agent-trading/       # JEV field, routing, evidence, trace, and motion
├── components/          # reusable media and platform primitives
├── main.tsx             # application composition
└── media.mjs            # media normalization

public/
├── brand/               # OMNIA visual identity
└── assets/              # platform marks used by trace context

scripts/                 # deterministic behavioral checks
```

The client uses React, TypeScript, Vite, and Three.js. The service boundary is native Node.js and exposes a health endpoint plus bounded internal passthroughs for the normalized capture and recent social-link envelopes.

### Core routing model

```ts
// A routed observation retains the evidence that introduced it.
type NeuralObservation = {
  tokenKey: string;
  captureId: string;
  receivedAt: string;
  field: {
    key: string;
    zone: 'Market' | 'Holders' | 'Risk' | 'Lifecycle' | 'Social';
    path: string;
  };
};
```

### Local development

```bash
npm install
npm run dev
```

```bash
npm run test
npm run typecheck
npm run build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system boundaries, data movement, and design decisions.
- [JEV Neural Graph](docs/JEV-NEURAL-GRAPH.md) — temporal graph, provenance, activation, and Laya context contract.
- [Data contract](docs/DATA-CONTRACT.md) — normalized envelopes and provenance invariants.
- [Security](docs/SECURITY.md) — trust boundaries and reporting path.
- [Engineering references](docs/REFERENCES.md) — standards and technical sources that inform the system.

## OMNIA EYE

JEV Neural Data Stream is proprietary software maintained by OMNIA EYE. The repository contains the presentation and routing layer; credentials, private connector configuration, raw capture storage, and source-specific access controls are maintained outside version control.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
