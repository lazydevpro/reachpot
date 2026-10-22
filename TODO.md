# TODO

Check-in: **2026-10-24 12:00 UTC** · Final / code freeze: **2026-11-06 04:00 UTC** · Spec: [docs/plans/spec.md](docs/plans/spec.md) · Plan: [docs/plans/plan.md](docs/plans/plan.md)

## Now
- [x] Spec + plan #docs
- [x] Throwaway testnet keys in `.env` (EVM deployer + native sr25519 admin) #infra
- [x] Workspace scaffold: Foundry (forge-std, OZ v5.1.0 submodules), pnpm, `scripts/` (viem + @polkadot/api) #infra
- [x] `Reachpot.sol` + 18 Foundry tests incl. fuzz (AC2–AC5) #contracts
- [ ] Fund native admin `5EqSmfgK1r4RCvxFaikQyH8j8Xktxs3Ay7SDYzURJWQqDUd5` with ~30–40 tPOT (user) #infra
- [~] Phase 0 spike: `pnpm spike` — precompile approve/transferFrom/transfer + recipients with no native balance #contracts #risk
- [ ] Create public GitHub repo `reachpot` + first push (user OK needed) #infra

## Next (check-in)
- [ ] Invariant test with handler (AC4) #contracts
- [ ] `packages/allocation`: water-filling + Merkle + golden fixtures (AC7) #allocation
- [ ] TransactionStorage snapshot + `verify` CLI (AC6) #native
- [ ] Deploy `Reachpot` + `scripts/e2e.ts` on testnet → `docs/deployments.md` (AC1) #scripts
- [ ] Minimal web: campaign, leaderboard, receipts #web
- [ ] README: pitch, mermaid architecture, deployments, quickstart, prior work #docs
- [ ] Submit check-in on DoraHacks (user) #submission

## Later (final)
- [ ] YouTube OAuth channel verification + Shorts submission #web
- [ ] Oracle / keeper cron #infra
- [ ] Creator badge NFTs with attributes (AC8) #native
- [ ] DEX cash-out to tPOT (AC9) #native
- [ ] Full web flows (AC10) #web
- [ ] Stretch: MetaTx-sponsored creator actions #native
- [ ] Hosted demo, demo video ≤3 min, pitch deck PDF #submission
