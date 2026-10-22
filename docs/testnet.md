# Testnet runbook (Portaldot V3)

Everything below runs from the repo root. Keys live in `.env` (gitignored). They are throwaway testnet keys
generated for this project. Never reuse them anywhere else.

## 1. Fund the native admin

The native admin (`NATIVE_ADMIN_ADDRESS` in `.env`) pays deposits and fees and funds every other role. Check it with:

```bash
pnpm accounts --network testnet
```

Send it **about 45 tPOT**. Rough budget (14 decimals, testnet constants):

| What | tPOT |
|---|---|
| Gas for EVM roles (deployer 4, oracle 3, guardian 1, brand 3) | 11 |
| 2 native assets (asset deposit 1 + metadata) | ~2.5 |
| 2 DEX pools (setup fee 1 each) + liquidity (5 + 2) | 9 |
| Badge collection (deposit 1) + metadata | ~2 |
| 2 demo creators (mapping deposit ~3.3 + fees each) | ~7.5 |
| TransactionStorage, payouts, badge attributes (~1.3 per creator) | ~4 |
| **Total** | **~36** |

Anything left over stays in the admin account. Deposits are reserved, not burned.

## 2. Deploy

```bash
pnpm deploy:testnet      # writes deployments/testnet.json (commit it)
```

Optional: `pnpm spike --network testnet` re-runs the precompile write-path spike on testnet and writes
`docs/spike-precompile-testnet.md`.

## 3. Run the app against testnet

```bash
NEXT_PUBLIC_NETWORK=testnet VIEWS_SOURCE=mock ENABLE_DEV_TOOLS=1 pnpm dev
```

- `VIEWS_SOURCE=mock` + `ENABLE_DEV_TOOLS=1` are only for the scripted run below, which uses made-up video ids. For real
  Shorts set `YOUTUBE_API_KEY` and drop both flags. Creators then prove ownership with the binding code shown in the UI.
- Brands connect MetaMask or Talisman (EVM, chain id 420420777); the app adds the network automatically. The brand's
  token must be a Portaldot native asset it holds. On testnet the deploy script mints rUSD/NOVA to `BRAND_PRIVATE_KEY`,
  or to the deployer if that isn't set.
- Creators connect Talisman, SubWallet or polkadot{.js} and click **Enable payouts** once (~3.3 tPOT refundable deposit).

## 4. Scripted end-to-end run (check-in evidence)

```bash
pnpm e2e --network testnet
```

This creates a campaign (5-minute window, 2-minute measurement delay, 10-minute dispute window), funds two throwaway
creators, submits Shorts, waits for the keeper to store the snapshot, post the root and pay out, verifies everything from
chain data, does a DEX cash-out and refunds the brand. Expect about 20 minutes. It writes **`docs/e2e-testnet.md`**
with every transaction hash.

## 5. Check-in checklist (DoraHacks, due 2026-10-24 12:00 UTC)

- [ ] Public repo: https://github.com/lazydevpro/reachpot
- [ ] README with architecture diagram (the mermaid diagram in README.md)
- [ ] Progress and outstanding items (TODO.md)
- [ ] Testnet contract address and deploy tx (`deployments/testnet.json`)
- [ ] Transaction hashes (`docs/e2e-testnet.md`) and explorer link (https://node-console.portaldot.dev)
- [ ] Demo: a video of 3 minutes or less, or a live link
