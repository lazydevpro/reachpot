# keeper-cron (Cloudflare Worker)

Ticks the hosted keeper every minute: `POST $KEEPER_URL/api/keeper/tick` with the `x-keeper-secret` header.
Vercel Hobby only allows a daily cron, so this free Cloudflare Cron Trigger is the frequent driver. The app keeps a
daily Vercel Cron as a backstop (`apps/web/vercel.json`). Overlapping ticks are safe, because the app holds a lease in
Postgres and returns `skipped` while another tick runs.

Deploy from the repo root. The secret is read from `.env`, so it is never printed.

```bash
npx wrangler@4 deploy --config infra/keeper-cron/wrangler.jsonc
```

```bash
grep '^KEEPER_SECRET=' .env | cut -d= -f2- | npx wrangler@4 secret put KEEPER_SECRET --config infra/keeper-cron/wrangler.jsonc
```

Watch it tick:

```bash
npx wrangler@4 tail reachpot-keeper-cron --config infra/keeper-cron/wrangler.jsonc
```
