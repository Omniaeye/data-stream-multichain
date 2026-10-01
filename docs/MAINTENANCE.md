# JEV public release and private test — 2026-09-28

## Current state: public reopening approved

The user explicitly approved publishing the existing MOMENTUM viewer while keeping the new Trenches preset local. The public build is served at `/jev/` from `public-dist`; `/` on the Railway viewer redirects there. The website proxies `/jev/*` to this viewer and strips cookies and authorization headers. Versioned public assets use gzip and immutable public caching; HTML and live API responses remain uncached. `/jev-test/` and all its assets/API routes retain Basic authentication.

`npm run build` now builds both `/jev-test/` and `/jev/`. `jevEndpoint` keeps assets and data inside their respective prefixes. Trenches is loaded only in Vite development (`import.meta.env.DEV`), and was excluded entirely from this public release package. The source of this release is the previously verified MOMENTUM package plus routing/build changes, not the unfinished local workspace.

This is approval to publish the current version, not evidence that the outstanding publication gaps or analytics degradation have been fixed. See `C:/Users/PC/Desktop/ArbitrageStocks/artifacts/jev-public-trenches-20260928/` for deployment checks. Core/collectors/databases were not changed in this publication.

## Historical maintenance deployment (superseded)

Approved public copy: “We’re upgrading JEV/LAYA.” Public HTML remains HTTP 503 with no-store at eyeomnia.com/jev/ and the direct Railway viewer domain. Health checks and existing /__jev connectors keep their behavior.

The authenticated test is https://data-stream-multichain-production.up.railway.app/jev-test/. HTML, compiled assets and the /jev-test/__jev/ endpoints require Basic authentication. Credentials are outside the repository and release artifacts; the viewer service stores only JEV_TEST_AUTH_SHA256, the SHA-256 digest of username:password. No valid digest means the private route is disabled (404). The upstream connector continues to use its own gateway credential.

The default npm run build compiles the viewer into test-dist with base /jev-test/, then copies public maintenance assets into dist. The private handler authenticates before serving test-dist. npm run build:viewer retains the original standalone Vite build for later use. Do not use that command for this maintenance deployment.

The first online attempt authenticated correctly but returned 404 because Railway invoked the default build script, which still ran plain vite build; test-dist was absent. Correcting the standard build script resolved the packaging error. Deployment status or /healthz alone does not certify that the private page exists or receives data.

Active viewer deployment: 6b032657-bb24-4b59-b498-dfaee1c9c76f. Core: 3f6508ee-4818-438e-b684-a50ebfd31672. Uploaded by Railway CLI from isolated packages. Changes are not committed or pushed.

To revoke test access, remove or replace JEV_TEST_AUTH_SHA256 and deploy/restart this viewer service. Browser Basic credentials may remain cached; revocation belongs on the server. Never place the password in a URL or client bundle.

Public restoration still requires validation of large payloads/slow networks, internal delivery latency, analytics and sustained operation. Coordinate the independent eyeomnia.com/jev/ website release. The private test is not approval to reopen the public viewer.

Evidence: C:/Users/PC/Desktop/ArbitrageStocks/artifacts/jev-private-live-20260928/. Earlier public release: artifacts/jev-maintenance-publish-20260928/.
