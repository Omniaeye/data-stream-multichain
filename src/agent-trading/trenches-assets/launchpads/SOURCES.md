# Launchpad catalog and brand sources

Checked 2026-09-29. Icons identify launch platforms, not a token endorsement. Network grouping is UI metadata; it never assigns a token origin. Origin still comes exclusively from launchpad_platform / launchpad.

## Catalog networks

- Solana: Pump.fun, StonkFun, Meteora, Bags, LetsBONK, Raydium LaunchLab.
- BSC: Flap, Four.meme, OpenFour, Genius.fun.
- Robinhood: Pons, Flap, Long.xyz, Bags, Bankr, Noxa, StonkBroker, Pools.trade, Lunch, Klik, Circus, Pair Fund.

Most associations were observed directly in the public captured feed on 2026-09-29. Counts retained in ArbitrageStocks/artifacts/trenches-compact-networks-20260929/observed-venues.json. StonkBroker is documented by https://stonkbrokers.io/home; PAIR by its announcement https://www.globenewswire.com/news-release/2026/08/31/3353221/0/en/pair-launches-the-first-multipool-rwa-launchpad-on-robinhood-chain-pairing-new-tokens-with-baskets-of-tokenized-stocks-partners-with-aws-to-scale-its-infrastructure.html . Additional explicit token chain/origin pairs extend the catalog; unknown reported values are scoped to observed chains. Known entries remain selectable without current tokens. Unspecified is available per network and does not guess origin from chain or exchange.

## Local image sources

Existing assets retained:
- pump.svg: https://pump.fun/pump-logomark.svg
- stonkfun.png: https://www.stonkfun.xyz/stonkfun-logo.png
- flap.svg: https://flap.sh/icon.svg
- fourmeme.svg: https://four.meme/_next/static/media/logo-square.05d-1ttqbfnze.svg
- meteora.svg: https://www.meteora.ag/icons/v2.svg
- bags.png: https://bags.fm/icon.png?0932b26a17d58d2a
- bankr.svg: https://bankr.bot/favicon.svg
- pons.png: existing OMNIA race/community/pons.png. Current pons.family retrieval failed; preserved established asset, not newly reverified.

Additional images taken from platform site icon declarations or its official media repository:
- letsbonk.png: https://www.letsbonk.fun/logos/bonk_fun.png
- raydium.svg: https://raw.githubusercontent.com/raydium-io/media-assets/master/logo.svg
- stonkbroker.png: https://stonkbrokers.io/favicon-32.png
- poolstrade.svg: https://pools.xyz/favicon.svg (pools.trade redirects here)
- openfour.svg: https://openfour.dev/favicon.svg
- klik.png: https://klik.finance/icon.png
- pairfund.png: https://pair.fund/pair-logo.png
- geniusfun.svg: https://genius.fun/icon.svg?73e5792b88d71a92
- noxa.png: https://fun.noxa.eth.limo/favicon.png (original NOXA Fun interface, not a newer namesake)
- lunch.png: https://www.lunch.fun/icon.png?icon.20kzkqvc-ts-s.png
- circus.svg: https://circus.trade/circus-mark-dark.svg

Large new PNGs were downscaled proportionally to fit 96x96 with Pillow LANCZOS, preserving transparency. SVGs were checked for script/event/external-reference content. Imported images ship with the build and require no third-party browser requests.

Long.xyz returned HTTP403 on its official app. Its control displays the name only; no invented logo. Source-reported unknown platform IDs also display their name only. Candidate lunch.money redirected to an unrelated transport business and was rejected. Research outputs record failures as well as successful images.
