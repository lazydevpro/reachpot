# Deploying the web app (Vercel + Neon + GitHub Actions)

**Live:** https://reachpot.vercel.app — Vercel project `reachpot` (team `lazydevpros-projects-15b62d5b`), linked from the
repo root with the CLI (`.vercel/`, gitignored), Neon database `reachpot-db`, keeper secrets set on GitHub.

CLI equivalents of the steps below (already done for the live project):

```bash
vercel project create reachpot --scope <team>
vercel link --yes --project reachpot --scope <team>
vercel project update reachpot --root-directory apps/web --framework nextjs --node-version 22.x --fluid-compute --scope <team> --yes
vercel integration add neon --name reachpot-db -e production -e preview -e development --no-env-pull --scope <team>
printf '%s' "<value>" | vercel env add KEEPER_SECRET production --sensitive --scope <team>   # same for the other vars
vercel deploy --prod --scope <team>
```

Auto-deploy on push needs the Vercel GitHub app to have access to the repo (GitHub → Settings → Applications → Vercel →
Repository access), then `vercel git connect --scope <team>`.

```
GitHub Actions ──every ~1 min──▶ POST /api/keeper/tick ─┐
                                                        ▼
Browser ──▶ Vercel (Next.js app + API, Node runtime) ──▶ Portaldot V3 testnet (EVM RPC + Substrate WS)
                         │
                         └──▶ Neon Postgres (DATABASE_URL)
```

- **Vercel** hosts the Next.js app and API. Contract addresses come from `deployments/testnet.json`, which is bundled at build time.
- **Neon Postgres** replaces the embedded PGlite. The schema creates itself on first use.
- **GitHub Actions** drives the keeper, because Vercel Hobby crons run at most once a day.
  [`keeper.yml`](../.github/workflows/keeper.yml) ticks about once a minute.
  [`ci.yml`](../.github/workflows/ci.yml) runs contract tests, allocation tests, typechecks and a production build on every push.

## 1. Create the Vercel project (one time, ~3 minutes)

1. https://vercel.com/new → **Import** `lazydevpro/reachpot`.
2. **Root Directory:** `apps/web`. Framework is detected as Next.js. Keep "Include files outside the root directory"
   **on**, because the app imports the workspace packages and `deployments/testnet.json`.
3. **Node.js version:** 22.x (Settings → General).
4. Don't deploy yet. Add storage and env vars first (steps 2–3), or redeploy afterwards.

## 2. Add Postgres (Neon via Vercel Marketplace)

Project → **Storage** → **Create** → **Neon (Postgres)** → free plan → connect it to the project (all environments).
This injects `DATABASE_URL`, which the app uses automatically.

## 3. Environment variables (Project → Settings → Environment Variables → Production)

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_NETWORK` | `testnet` | |
| `KEEPER_SECRET` | value of `KEEPER_SECRET` in your local `.env` | protects `/api/keeper/tick` |
| `ORACLE_PRIVATE_KEY` | value of `DEPLOYER_PRIVATE_KEY` in `.env` | on testnet one EVM key holds the oracle role |
| `NATIVE_ADMIN_MNEMONIC` | value of `NATIVE_ADMIN_MNEMONIC` in `.env` (without quotes) | publishes snapshots, mints badges |
| `VIEWS_SOURCE` | `mock` | until you add `YOUTUBE_API_KEY` |
| `YOUTUBE_API_KEY` | *(optional)* | real Shorts: views + channel binding code |
| `ENABLE_DEV_TOOLS` | `1` | **only** while running the scripted e2e (needs the keeper secret too); remove afterwards |
| `DATABASE_URL` | *(set by Neon)* | |

These are throwaway **testnet** keys generated for this project. Never put mainnet keys on a hosting provider.

Then **Deploy**. Check it works:

```bash
curl -s https://<your-app>.vercel.app/api/config
```

It should return `"network":"testnet"` and `"reachpot":"0xcfcdb8cc…"`.

## 4. Keeper secrets for GitHub Actions

Run these from the repo root. They read the value from `.env`, so it is never printed.

```bash
grep '^KEEPER_SECRET=' .env | cut -d= -f2- | gh secret set KEEPER_SECRET --repo lazydevpro/reachpot
```

```bash
gh secret set KEEPER_URL --repo lazydevpro/reachpot --body "https://<your-app>.vercel.app"
```

Start the first run by hand rather than waiting for the schedule:

```bash
gh workflow run keeper.yml --repo lazydevpro/reachpot
```

## 5. End-to-end on testnet against the deployed app (once more tPOT arrives)

```bash
pnpm e2e --network testnet --web https://<your-app>.vercel.app
```

Needs `VIEWS_SOURCE=mock` + `ENABLE_DEV_TOOLS=1` on Vercel during the run, plus ~60 tPOT
([budget](testnet.md#1-fund-the-native-admin)). The deployed keeper (GitHub Actions) and the script's own ticks both
drive the campaign through snapshot → root → dispute window (10 min) → payouts → badges. Results go to `docs/e2e-testnet.md`.

## Local equivalents

| Production | Local |
|---|---|
| Neon `DATABASE_URL` | PGlite in `apps/web/.data/` (unset `DATABASE_URL`) |
| GitHub Actions keeper | in-process loop (`instrumentation.ts`) |
| Bundled `deployments/testnet.json` | live file, re-read on change |
