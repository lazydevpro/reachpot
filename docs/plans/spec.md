# Reachpot — spec

> Portaldot Hacker House 2026 · track: **Ecosystem DApps** · status: draft (2026-10-22)

## Problem

Brands and crypto projects pay short-form creators ("clippers") per view, but the usual fixed-CPM model:

1. **Drains first-come** — the budget runs out early and late creators with good posts earn nothing.
2. **Is opaque** — the platform decides what counts and pays off-chain, and payouts don't reach every country.
3. **Rewards rejection** — rejecting a submission saves the brand money, so creators carry the risk.

Portaldot projects have a second problem: they want creators to promote **their own token**. Paying in that token
is useless to a creator unless they can cash it out straight away.

## Solution

A **pro-rata creator pool escrowed on Portaldot**. A brand locks a pool in any Portaldot native asset, creators submit
YouTube Shorts, and when the window ends the pool is split **by views**, with a per-creator cap. Every creator is paid
on-chain. Rejecting a creator saves the brand nothing, because the share goes to the other creators.

### Why Portaldot is essential (V3 features used)

| V3 feature | Use in Reachpot |
|---|---|
| `Revive` (EVM) + `AssetsPrecompiles` | The Solidity escrow holds **native `Assets` tokens through their ERC-20 precompile** (`0x{assetId}…00010000`), so any brand token works with no wrapping and no bridge. |
| `AssetConversion` (native DEX) | Creators paid in a brand token can **cash out to tPOT** in one action. Campaigns also add liquidity and volume to the brand's pool. |
| `TransactionStorage` | The full view snapshot is **stored on-chain for about 7 days and then pruned**. That covers the dispute window and fits YouTube's ≤30-day storage rule. Only the hash and Merkle root stay permanently. |
| `Nfts` | Creators earn a **non-transferable creator badge** whose attributes (campaigns, views, earned) form a portable on-chain résumé. |
| `MetaTx` *(stretch)* | Creator actions are sponsored, so creators never need tPOT. |

## Users

- **Brand / project**: funds a campaign in its token or a stable asset, and wants guaranteed, fair spend.
- **Creator**: posts Shorts, wants to be paid quickly and in something they can use.
- **Verifier** (anyone): recomputes the payout root from the on-chain snapshot during the dispute window.

## Scope

### Check-in MVP (due 2026-10-24 12:00 UTC)

- `Reachpot.sol` deployed on V3 testnet. Funding uses a native asset through the precompile; the flow covers root posting, the dispute window and batched payouts.
- An end-to-end testnet script that produces real contract addresses and tx hashes (recorded in `docs/deployments.md`).
- The snapshot stored in `TransactionStorage`, with its hash pinned in the contract.
- A minimal web page showing a campaign, its leaderboard and its payout receipts. Simulated view data is OK.
- README with an architecture diagram.

### Final (due 2026-11-06 04:00 UTC)

- Real YouTube channel verification (read-only OAuth) and Shorts submission.
- Creator badge NFTs with attributes, updated on each payout.
- DEX cash-out of payouts to tPOT.
- Hosted demo, video of 3 minutes or less, pitch deck.
- Stretch: `MetaTx`-sponsored creator actions; brand pays fees in its own asset (`AssetConversionTxPayment`).

### Non-goals (v1)

- Trustless view counts. The oracle is trusted in v1, mitigated by the published snapshot, the open allocation code
  and the dispute window.
- Platforms other than YouTube Shorts.
- ink!/WASM contracts. Cross-calls between ink! and Solidity are undocumented on Portaldot, see the FAQ.

## Acceptance criteria

| # | Criterion | Verified by |
|---|---|---|
| AC1 | A brand funds a campaign with a native `Assets` token via the precompile in 2 txs (approve + create). | Testnet tx hashes |
| AC2 | `postRoot` reverts before `end + measurementDelay` and from any account other than the oracle. | Foundry tests |
| AC3 | The guardian can cancel a root only inside the dispute window; claims are blocked until the window closes. | Foundry tests |
| AC4 | Payouts never exceed the pool (`claimed ≤ totalAllocated ≤ pool`), each leaf is paid exactly once, and the remainder is refundable to the brand. | Fuzz + invariant tests |
| AC5 | One failing recipient does not block a `claimMany` batch. | Foundry test |
| AC6 | The snapshot is stored in `TransactionStorage`; `verify` recomputes the posted root from the on-chain data. | Testnet + CLI |
| AC7 | The allocation is deterministic, respects the per-creator cap and `minViews`, and its sum is ≤ the pool. Golden fixtures are shared between TS and Solidity. | Unit tests |
| AC8 | After payout each creator holds a non-transferable badge NFT with updated attributes. | Testnet query |
| AC9 | A creator can swap a payout to tPOT via `AssetConversion`. | Testnet tx hash |
| AC10 | Web pages: campaign list and detail, submit, leaderboard, receipts. | Browser check |

## Risks / open questions

1. **Precompile write path.** Only reads (`totalSupply`, `decimals`) are verified. `approve` from an EOA and
   `transferFrom`/`transfer` from a contract must be proven first (spike).
2. **Recipients without a native balance.** `Assets` tokens need the recipient account to exist (native ED 0.1 tPOT)
   unless the asset is "sufficient", and holder accounts carry a 1 tPOT deposit. Fresh creator wallets may hit
   `NoProvider`. Options: send ED with the payout, have the keeper `touch_other`, or pay in native tPOT.
   **Decide after the spike.**
3. **Creator cash-out signing.** Creator funds sit in their H160's fallback account. A DEX swap is a native extrinsic,
   so it needs either a native wallet (e.g. Talisman) or `Revive.ethSubstrateCall` / `dispatchAsFallbackAccount`
   from MetaMask. Needs verification.
4. **Pruned public node.** `TransactionStorage` data and old block bodies may not be retrievable from the public RPC
   after pruning. Fetch and cache the snapshot at post time.

## Eligibility notes

- New repository; all code is written during Hacker House (from 2026-10-22). Commit steadily, with no core-module dump
  in the final 24h.
- **Prior work (disclosed in the README):** the pro-rata creator-pool concept comes from the author's earlier ClipPool
  on Arc. No code is copied; Reachpot is a fresh Portaldot-native implementation.
- Third-party dependencies (OpenZeppelin, viem, @polkadot/api, Next.js, …) are listed in the README.
