# TODO

Check-in: **2026-10-24 12:00 UTC** · Final / code freeze: **2026-11-06 04:00 UTC** · Spec: [docs/plans/spec.md](docs/plans/spec.md) · Testnet runbook: [docs/testnet.md](docs/testnet.md)

## Now (blocked on testnet tPOT)
- [ ] Fund native admin `5EqSmfgK1r4RCvxFaikQyH8j8Xktxs3Ay7SDYzURJWQqDUd5` with ~45 tPOT (user) #infra
- [ ] `pnpm deploy:testnet` → commit `deployments/testnet.json` #deploy
- [ ] `pnpm e2e --network testnet` → commit `docs/e2e-testnet.md` (tx hashes) #deploy
- [x] Record demo video ≤3 min: narrated, 102 s, `demo/reachpot-demo.mp4` (gitignored; local chain + live-site intro) #submission
- [x] Check-in submitted on DoraHacks 2026-10-23 (Build https://dorahacks.io/build/50212, Ecosystem DApps, under review; video https://youtu.be/EtGjwMlh9Zg) #submission

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
- [x] Check-in feedback (Oct 26): PASSED. Fixed the one finding ("test script hardcodes pnpm"): `npm test` now works from a plain clone with no pnpm (scripts/setup.sh + scripts/test.sh) #review
- [ ] Real YouTube mode on testnet with a real Short (needs `YOUTUBE_API_KEY`) #web
- [x] Hosting prep: Postgres adapter (Neon via DATABASE_URL, verified with the full e2e over the wire protocol), bundled testnet deployment, serverless guards, CI + keeper GitHub Actions, [docs/deploy.md](docs/deploy.md) #infra
- [x] Vercel project `reachpot` live at https://reachpot.vercel.app (Neon `reachpot-db`, env vars, keeper secrets on GitHub) #infra
- [x] Vercel ↔ GitHub connected: every push to main auto-deploys #infra
- [x] Keeper ticked every minute by a Cloudflare Worker (`infra/keeper-cron`, Durable Object alarm loop) + daily Vercel Cron backstop + Postgres lease so ticks never overlap; GitHub schedule retired (it fired hours apart) #infra
- [x] Demo video with OpenScreen: site tour intro, demo, outro, Gemini TTS narration (`openscreen-demo-plan.md`) #submission
- [x] Testnet e2e against the hosted app green → [docs/e2e-testnet.md](docs/e2e-testnet.md) #deploy
- [ ] (Alternative host) Cloudflare Workers Paid: vinext + D1 + cron Worker — only if moving off Vercel #infra
- [ ] Invariant test with handler (AC4 extra) #contracts
- [ ] Guardian UI (cancel root) #web
- [ ] Stretch: MetaTx-sponsored creator actions; sponsor the mapAccount deposit for first-time creators #native
- [x] Pitch deck PDF ([docs/pitch/Reachpot-pitch.pdf](docs/pitch/Reachpot-pitch.pdf)) #submission
- [ ] Final README pass #submission
