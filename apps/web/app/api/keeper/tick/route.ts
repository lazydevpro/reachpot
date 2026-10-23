import { HttpError } from '@/lib/server/campaigns';
import { serverEnv } from '@/lib/server/env';
import { handle } from '@/lib/server/http';
import { keeperTick } from '@/lib/server/keeper';

/** A pass waits for several blocks on testnet (snapshot, root, payouts, badges); allow up to 5 minutes. */
export const maxDuration = 300;

/** Runs one keeper pass. Protected by KEEPER_SECRET (header `x-keeper-secret`); used by the Cloudflare cron and the e2e script. */
export async function POST(req: Request) {
  return handle(async () => {
    if (!serverEnv.keeperSecret || req.headers.get('x-keeper-secret') !== serverEnv.keeperSecret) throw new HttpError(401, 'bad keeper secret');
    return keeperTick();
  });
}

/** Vercel Cron (daily backstop, see vercel.json) calls GET with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  return handle(async () => {
    if (!serverEnv.cronSecret || req.headers.get('authorization') !== `Bearer ${serverEnv.cronSecret}`) throw new HttpError(401, 'bad cron secret');
    return keeperTick();
  });
}
