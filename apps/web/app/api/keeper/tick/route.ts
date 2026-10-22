import { HttpError } from '@/lib/server/campaigns';
import { serverEnv } from '@/lib/server/env';
import { handle } from '@/lib/server/http';
import { keeperTick } from '@/lib/server/keeper';

/** Runs one keeper pass. Protected by KEEPER_SECRET (header `x-keeper-secret`); used by cron and the e2e script. */
export async function POST(req: Request) {
  return handle(async () => {
    if (!serverEnv.keeperSecret || req.headers.get('x-keeper-secret') !== serverEnv.keeperSecret) throw new HttpError(401, 'bad keeper secret');
    return keeperTick();
  });
}
