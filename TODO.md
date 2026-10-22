# TODO

Check-in: **2026-10-24 12:00 UTC** · Final / code freeze: **2026-11-06 04:00 UTC** · Spec: [docs/plans/spec.md](docs/plans/spec.md) · Testnet runbook: [docs/testnet.md](docs/testnet.md)

## Now (blocked on testnet tPOT)
- [ ] Fund native admin `5EqSmfgK1r4RCvxFaikQyH8j8Xktxs3Ay7SDYzURJWQqDUd5` with ~45 tPOT (user) #infra
- [ ] `pnpm deploy:testnet` → commit `deployments/testnet.json` #deploy
- [ ] `pnpm e2e --network testnet` → commit `docs/e2e-testnet.md` (tx hashes) #deploy
- [ ] Record demo video ≤3 min (local or testnet) #submission
- [ ] Submit check-in on DoraHacks (user) #submission

## Done
- [x] Spec, plan, eligibility notes, prior-work disclosure #docs
- [x] `Reachpot.sol` + 23 Foundry tests (unit, fuzz, golden fixtures) — AC2–AC5, AC7 #contracts
- [x] `@reachpot/allocation`: water-filling, Merkle, snapshot v1, verify CLI, 17 tests — AC6, AC7 #allocation
- [x] Local chain (Parity kitchensink + eth-rpc, sha256-verified), `@reachpot/core`, deploy script #infra
- [x] Precompile spike: approve / transferFrom / payout to mapped creator verified on local #risk
- [x] Keeper: views → TransactionStorage snapshot → root → payouts (ED top-ups, skip failures) → soulbound badges — AC6, AC8 #native
- [x] Web: krafa-style landing, explorer, create (precompile approve), campaign page with in-browser verification, submit (signed, mapAccount), creator dashboard with DEX cash-out — AC1, AC9, AC10 #web
- [x] `pnpm e2e` full lifecycle green on local → [docs/e2e-local.md](docs/e2e-local.md) #e2e
- [x] Lint + production build green #web

## Next (final, by Nov 6)
- [ ] Real YouTube mode on testnet with a real Short (needs `YOUTUBE_API_KEY`) #web
- [ ] Hosted demo: Postgres (Neon) adapter for the DB + cron for the keeper (PGlite is single-process) #infra
- [ ] Invariant test with handler (AC4 extra) #contracts
- [ ] Guardian UI (cancel root) #web
- [ ] Stretch: MetaTx-sponsored creator actions; sponsor the mapAccount deposit for first-time creators #native
- [ ] Pitch deck PDF + final README pass #submission
