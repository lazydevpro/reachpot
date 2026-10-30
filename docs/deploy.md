# Deploying the web app (Vercel + Neon + Cloudflare cron)

**Live:** https://reachpot.vercel.app — Vercel project `reachpot` (team `lazydevpros-projects-15b62d5b`), linked from the
repo root with the CLI (`.vercel/`, gitignored), Neon database `reachpot-db`, keeper ticked every minute by the
Cloudflare Worker `reachpot-keeper-cron`.

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
Cloudflare cron ──every 1 min──▶ POST /api/keeper/tick ─┐   (+ daily Vercel Cron backstop: GET, Bearer CRON_SECRET)
                                                        ▼
Browser ──▶ Vercel (Next.js app + API, Node runtime) ──▶ Portaldot V3 testnet (EVM RPC + Substrate WS)
                         │
                         └──▶ Neon Postgres (DATABASE_URL)
```

- **Vercel** hosts the Next.js app and API. Contract addresses come from `deployments/testnet.json`, which is bundled at build time.
- **Neon Postgres** replaces the embedded PGlite. The schema creates itself on first use.
- **A Cloudflare Worker** ([`infra/keeper-cron`](../infra/keeper-cron)) ticks the keeper every minute, because Vercel
  Hobby crons run at most once a day and GitHub's scheduled workflows fired hours apart. A daily Vercel Cron
  ([`apps/web/vercel.json`](../apps/web/vercel.json)) is the backstop. Overlapping ticks are safe: a lease row in
  Postgres lets one tick run at a time across serverless instances; the others return `skipped`.
- **GitHub Actions:** [`ci.yml`](../.github/workflows/ci.yml) runs contract tests, allocation tests, typechecks and a
  production build on every push. [`keeper.yml`](../.github/workflows/keeper.yml) is a manual burst of ticks.

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
| `KEEPER_SECRET` | value of `KEEPER_SECRET` in your local `.env` | protects `POST /api/keeper/tick` |
| `CRON_SECRET` | any random string | Vercel Cron sends it as `Authorization: Bearer …` to `GET /api/keeper/tick` |
| `ORACLE_PRIVATE_KEY` | value of `DEPLOYER_PRIVATE_KEY` in `.env` | on testnet one EVM key holds the oracle role |
| `NATIVE_ADMIN_MNEMONIC` | value of `NATIVE_ADMIN_MNEMONIC` in `.env` (without quotes) | publishes snapshots, mints badges |
| `VIEWS_SOURCE` | `youtube` | `mock` only for the scripted e2e (simulated views) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | real Shorts: views + description binding code (1 quota unit per 50 videos per refresh) |
| `ENABLE_DEV_TOOLS` | `1` | **only** while running the scripted e2e (needs the keeper secret too); remove afterwards |
| `DATABASE_URL` | *(set by Neon)* | |

These are throwaway **testnet** keys generated for this project. Never put mainnet keys on a hosting provider.

Then **Deploy**. Check it works:

```bash
curl -s https://<your-app>.vercel.app/api/config
```

It should return `"network":"testnet"` and `"reachpot":"0xcfcdb8cc…"`.

## 4. Keeper cron (Cloudflare Worker)

Deploy [`infra/keeper-cron`](../infra/keeper-cron) to your Cloudflare account and give it the keeper secret. The
secret is read from `.env`, so it is never printed.

```bash
npx wrangler@4 deploy --config infra/keeper-cron/wrangler.jsonc
```

```bash
grep '^KEEPER_SECRET=' .env | cut -d= -f2- | npx wrangler@4 secret put KEEPER_SECRET --config infra/keeper-cron/wrangler.jsonc
```

Set `KEEPER_URL` in `wrangler.jsonc` to your app's URL. The Worker loops on a Durable Object alarm (no Cron Trigger
slot needed; the free plan allows 5 per account). Start the loop once, and check on it any time, with a request to the
Worker: it returns the next tick time and the last tick's status. `npx wrangler@4 tail reachpot-keeper-cron` shows
each tick.

```bash
curl -s https://reachpot-keeper-cron.<your-subdomain>.workers.dev
```

### Optional: manual ticks from GitHub Actions

Run these from the repo root. They read the value from `.env`, so it is never printed.

```bash
grep '^KEEPER_SECRET=' .env | cut -d= -f2- | gh secret set KEEPER_SECRET --repo lazydevpro/reachpot
```

```bash
gh secret set KEEPER_URL --repo lazydevpro/reachpot --body "https://<your-app>.vercel.app"
```

Start a burst of ticks (one a minute for five minutes):

```bash
gh workflow run keeper.yml --repo lazydevpro/reachpot
```

## 5. End-to-end on testnet against the deployed app (once more tPOT arrives)

```bash
pnpm e2e --network testnet --web https://<your-app>.vercel.app
```

Needs `VIEWS_SOURCE=mock` + `ENABLE_DEV_TOOLS=1` on Vercel during the run, plus ~60 tPOT
([budget](testnet.md#1-fund-the-native-admin)). The deployed keeper (Cloudflare cron) and the script's own ticks both
drive the campaign through snapshot → root → dispute window (10 min) → payouts → badges. Results go to `docs/e2e-testnet.md`.

## Local equivalents

| Production | Local |
|---|---|
| Neon `DATABASE_URL` | PGlite in `apps/web/.data/` (unset `DATABASE_URL`) |
| Cloudflare cron keeper | in-process loop (`instrumentation.ts`) |
| Bundled `deployments/testnet.json` | live file, re-read on change |
