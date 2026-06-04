# External API Return Comparison

This file compares the current `src/external-api.ts` returns with the old `master` implementation (`33c6c1d`) after the migration to `prices.curve.finance`.

The goal is return-shape compatibility first. Count differences below are live upstream differences, not adapter-key differences.

## Compared functions

### Pools

Old:
- `uncached_getAllPoolsFromApi(network, isLiteChain)`
- `_getPoolsFromApi(network, poolType, isLiteChain)`

New:
- `uncached_getAllPoolsFromApi(network, chainId, isLiteChain)`
- `_getPoolsFromApi(network, chainId, poolType, isLiteChain)` through the same cached shape

Status:
- Top-level return shape is kept compatible: `Record<IPoolType, { poolData, tvl, tvlAll }>`
- `poolData` entries now expose the old structural fields again where possible:
  - `coinsAddresses`
  - `decimals`
  - `virtualPrice`
  - `priceOracle`
  - `priceOracles`
  - `poolUrls`
  - `usdTotalExcludingBasePool`
  - `gaugeFutureCrvApy`
  - `usesRateOracle`
  - `isBroken`
  - `hasMethods`
  - `creationTs`
  - `creationBlockNumber`
  - richer `coins[]` entries with `name`, `poolBalance`, `isBasePoolLpToken`

Notes:
- Some fields are reconstructed or defaulted because `prices.curve.finance` does not provide the old values directly:
  - `gaugeFutureCrvApy`: mirrored from `gaugeCrvApy`
- `basePoolAddress`, `implementationAddress`, `gaugeAddress`, `gaugeCrvApy`, `gaugeRewards`, and `gaugeFutureCrvApy` are only emitted when available.

Live `ethereum` count comparison on May 7, 2026:

| Pool type | Current | Master |
| --- | ---: | ---: |
| `main` | 37 | 49 |
| `crypto` | 7 | 8 |
| `factory` | 164 | 381 |
| `factory-crvusd` | 18 | 29 |
| `factory-crypto` | 150 | 401 |
| `factory-twocrypto` | 111 | 364 |
| `factory-tricrypto` | 54 | 117 |
| `factory-stable-ng` | 463 | 837 |

Interpretation:
- The adapter now returns the old structure closely enough for downstream callers.
- The remaining pool difference is mostly upstream coverage: `prices.curve.finance/v1/chains/{chain}` currently returns fewer pools than old `getPools`.

### Volumes

Old:
- `_getVolumes(network)`
- `_getSubgraphData(network)`
- `_getFactoryAPYs(network)`

New:
- `_getVolumes(network)` only

Status:
- `_getVolumes(network)` keeps the same return shape:
  - `poolsData: { address, volumeUSD, day, week }[]`
  - `totalVolume`
  - `cryptoVolume`
  - `cryptoShare`

Notes:
- Volume now comes from the same `prices.curve.finance/v1/chains/{chain}` payload as pools.
- `_getSubgraphData` and `_getFactoryAPYs` were removed entirely.

### Gauges

Old:
- `_getAllGauges()`
- `_getAllGaugesFormatted()`

New:
- `_getAllGauges()` from `prices.curve.finance/v1/dao/gauges/overview`
- `_getAllGaugesFormatted()` derived from `_getAllGauges()`

Status:
- `_getAllGaugesFormatted()` matches the old shape:
  - `{ [gaugeAddressLower]: { is_killed, gaugeStatus } }`
- `_getAllGauges()` now exposes the old fields again:
  - `isPool`
  - `name`
  - `poolAddress`
  - `virtualPrice`
  - `factory`
  - `type`
  - `lpTokenPrice`
  - `gauge_data`
  - `gauge_controller.gauge_future_relative_weight`
  - `gauge_controller.inflation_rate`
  - `gaugeCrvApy`
  - `gaugeFutureCrvApy`
  - `side_chain`
  - conditional `rootGauge`
  - conditional `gaugeStatus`

Defaulted fields:
- `virtualPrice`: `0`
- `gauge_data.inflation_rate`: `"0"`
- `gauge_controller.inflation_rate`: `"0"`
- `gauge_controller.gauge_future_relative_weight`: `"0"`
- `gaugeFutureCrvApy`: mirrored from `gaugeCrvApy`

Live gauge comparison on May 7, 2026:
- Current raw gauge count: `1281`
- Master raw gauge count: `2023`
- Sample entry key set: matched
- Formatted gauge entry key set: matched

Interpretation:
- Shape compatibility is restored.
- Count mismatch is upstream: `prices.curve.finance/v1/dao/gauges/overview` itself returned `1281` gauge entries.

### DAO proposals

Old:
- `_getDaoProposalList()`
- `_getDaoProposal(type, id)`

New:
- `_getDaoProposalList()` from `prices.curve.finance/v1/dao/proposals`
- `_getDaoProposal(type, id)` from `prices.curve.finance/v1/dao/proposals/details/{type}/{id}`

Status:
- Public return interfaces are kept the same:
  - `IDaoProposalListItem[]`
  - `IDaoProposal`

Notes:
- The current mapper preserves the old public shape.
- I could not complete a live old-vs-new response diff from this environment because the old llama endpoint timed out.

### Boosting proof

Old:
- `_generateBoostingProof(block, address)`

New:
- `_generateBoostingProof(block, address)`

Status:
- Same endpoint and same intended return shape:
  - `{ block_header_rlp, proof_rlp }`

Notes:
- During live comparison, the shared upstream returned `Internal Server Error` for both old and new calls, so only source-level compatibility was checked.

## Removed functions

These old functions no longer exist in the current adapter:
- `_getSubgraphData`
- `_getFactoryAPYs`
- `_getHiddenPools`

## Summary

What is compatible now:
- `_getVolumes`
- `_getAllGaugesFormatted`
- `_getAllGauges` sample entry shape
- pool container shape and most legacy pool entry fields
- DAO public return types
- boosting proof return contract

What still differs:
- pool counts and gauge counts from live upstream data
- some legacy values are defaulted because `prices.curve.finance` does not publish the old source values
- old removed functions are not replaced 1:1
