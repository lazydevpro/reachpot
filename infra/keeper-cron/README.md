# keeper-cron (Cloudflare Worker + Durable Object alarm)

Ticks the hosted keeper every minute: `POST $KEEPER_URL/api/keeper/tick` with the `x-keeper-secret` header.
Vercel Hobby only allows a daily cron, and GitHub's scheduled workflows fired hours apart, so this free Worker is the
frequent driver. It loops on a Durable Object alarm instead of a Cron Trigger, because the account's 5 free cron
triggers are used by other projects. The app keeps a daily Vercel Cron as a backstop (`apps/web/vercel.json`).
Overlapping ticks are safe, because the app holds a lease in Postgres and returns `skipped` while another tick runs.

Deploy from the repo root, then set the secret. It is read from `.env`, so it is never printed.

```bash
npx wrangler@4 deploy --config infra/keeper-cron/wrangler.jsonc
```

```bash
grep '^KEEPER_SECRET=' .env | cut -d= -f2- | npx wrangler@4 secret put KEEPER_SECRET --config infra/keeper-cron/wrangler.jsonc
```

Start the loop, or check on it later. Any request starts it if it isn't running and returns its status (next tick
time, and the last tick's HTTP status and report):

```bash
curl -s https://reachpot-keeper-cron.<your-subdomain>.workers.dev
```

Watch it tick:

```bash
npx wrangler@4 tail reachpot-keeper-cron --config infra/keeper-cron/wrangler.jsonc
```
