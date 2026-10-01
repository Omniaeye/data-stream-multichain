# MOMENTUM private preview — 2026-09-28

Scope: authenticated `/jev-test/` only. Public `/` and `/jev/` keep the approved maintenance page. No execution or trading activation.

## Arrivals and persistence

New eligible identities detected after the session baseline enter MOMENTUM. Four slots show individual arrivals for 6.5 seconds, followed by a 1.1-second transition into the normal field. Additional arrivals queue in order; no `+more` replacement toast. A previously seen identity is not announced again. This indicates first detection in the available feed, not proof of mint time or exhaustive chain coverage.

The renderer retains the last eligible observation for each source for up to 180 seconds, preserving evidence timestamps. Fresh risk, cap, liquidity and activity failures still apply. Whole-response failures retain the last capture; the UI says `Updating…`. Compact screens can scroll vertically and the token timeline remains horizontal.

## Startup and delivery

Authenticated versioned assets use gzip and private immutable browser caching. HTML and API responses remain no-store. The auth gate precedes conditional asset responses. No credential is shipped with the viewer.

`/__jev/bootstrap` prepares a shared small view every 15 seconds and coalesces concurrent initial reads. The browser restores a validated view at most five minutes old and then refreshes it. Views contain no delivery cursor or observation batches and never route old particles. The full validated session runs independently and supersedes the view.

Opt-in `wire=1` pools repeated normalized objects. Decoding preserves fields, capture identities, hashes and timestamps. Existing sequence, epoch, pagination and evidence checks still apply; the legacy wire route remains compatible. The browser allows 12 seconds for response headers, then a separate 12–30 second body budget derived from compressed content length. A stalled transfer still aborts. The prepared view also warms the full snapshot, and an existing packed response remains available while its exact cursor refreshes in the background. Original timestamps still control freshness. News, trading details and token logos start after the first verified capture. Visible logos load three at a time at low priority; external hosts may still fail. The existing eye artwork is served in three versioned 256-pixel WebP encodings (16,628 bytes combined instead of 4,711,273 bytes); original artwork and the public maintenance page remain unchanged.

## Social evidence

An author profile in token metadata is not evidence that every post refers to that token. Profile-only GOOGL/Robinhood links no longer create token chips. Exact captured post URLs from retained tokens can attach multiple tokens to one story. Existing inferred related coverage stays marked as inferred in its tooltip. No name-based causal association is invented.

## Verification boundaries

Automated tests and controlled Chrome replays exercise burst arrivals, HTTP failure, retention, cache restore, compression and 1 Mbps transfer. They do not prove uninterrupted production collection. The Core candidate only changes the existing reader to four bounded concurrent reads, preserving publication order. Raw collectors, persistence, analytics and source availability are separate stages.

Detailed measured results and deployment receipt: `ArbitrageStocks/artifacts/jev-momentum-20260928/`. Keep synthetic replay metrics separate from authenticated Railway observations. No 24–48 hour soak or physical-device certification is implied.

References: [HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching), [Chrome network emulation](https://chromedevtools.github.io/devtools-protocol/tot/Network/).
