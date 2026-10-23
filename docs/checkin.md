# DoraHacks check-in: paste-ready (due 2026-10-24 12:00 UTC)

## Project
**Reachpot**: get paid for your reach, fairly. Pro-rata creator campaigns on Portaldot V3, funded in any Portaldot
native asset. Track: **Ecosystem DApps**.

## Public GitHub repository
https://github.com/lazydevpro/reachpot (README with architecture diagram, spec/plan in `docs/plans/`, TODO.md, CI)

## Current progress
- **Contract `Reachpot.sol` deployed on Portaldot V3 testnet.** It escrows a brand's pot in any native `Assets` token
  through the native-asset ERC-20 precompile and posts a Merkle payout root pinned to an on-chain snapshot. It has a
  guardian dispute window, permissionless batched payouts that skip failing recipients, and refunds. 23 Foundry tests
  (unit, fuzz, golden fixtures shared with the TypeScript allocation engine).
- **Keeper / oracle.**
  1. Computes the capped pro-rata ("water-filling") split.
  2. Publishes the snapshot in **TransactionStorage** and posts the root.
  3. Pays every creator to their **Revive-mapped native account**.
  4. Mints and updates **soulbound creator badges (Nfts)**.
- **Web app (Next.js).** Krafa-style landing; brand flow (approve via precompile → lock pot); creator flow (Portaldot
  wallet, enable payouts with `revive.mapAccount`, signed Short submission); campaign page with **in-browser
  verification** (re-reads the snapshot from chain, checks its blake2 hash, recomputes the root); creator dashboard with
  **one-tap cash-out on the native DEX (AssetConversion)**.
- **Full lifecycle verified end to end** on a local chain running Portaldot's runtime (Parity kitchensink + eth-rpc):
  [docs/e2e-local.md](e2e-local.md).
- **Ready to host:** Vercel + Neon Postgres + GitHub Actions keeper; CI on every push ([docs/deploy.md](deploy.md)).

- **Full lifecycle run end to end on testnet** against the hosted app (https://reachpot.vercel.app): every step and
  transaction hash is in [docs/e2e-testnet.md](e2e-testnet.md). The snapshot was stored in TransactionStorage at
  block 157,841, two creators were paid 4,000 rUSD each (capped), badges were minted, a creator cashed out on
  AssetConversion and the brand reclaimed the 2,000 rUSD remainder.

## Outstanding items
- Real YouTube verification (Data API key) instead of simulated views.
- Final demo video, pitch deck, guardian UI.

## Product architecture diagram
See the mermaid diagram in the README ("How it works").

## Portaldot testnet deployment information
| | |
|---|---|
| Reachpot contract | `0xcfcdb8ccac9b95534aedbbe9c90e49a6a1d493cf` |
| Deploy transaction | `0x437ca8659ea19af2ba7cc578e755eed2f3d1aaca4a7d1a65dada5412c6273a15` (block 150,033) |
| Explorer | https://node-console.portaldot.dev/?rpc=wss%3A%2F%2Ftest-node-v3.portaldot.dev#/explorer/query/150033 |
| Native assets | rUSD `7770` (ERC-20 precompile `0x00001e5a00000000000000000000000000010000`), NOVA `7771` |
| Native DEX pools | rUSD/tPOT, NOVA/tPOT (AssetConversion) |
| Creator badge collection | Nfts collection `4` |
| Full details | [deployments/testnet.json](../deployments/testnet.json) |

## Initial demo material
**Live DApp:** https://reachpot.vercel.app (Portaldot V3 testnet; brands connect MetaMask/Talisman, creators a Portaldot wallet).

Demo video (≤3 min, recorded on the local chain, which runs Portaldot's runtime) showing: brand locks a pot →
creators submit → snapshot stored in TransactionStorage → root → payouts → in-browser verification → DEX cash-out.
*(add the video link here)*
