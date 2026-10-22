import { serverEnv } from './env';

const g = globalThis as unknown as { __reachpotLoop?: ReturnType<typeof setInterval> };

/**
 * Background keeper for the Next server process (disable with KEEPER_AUTORUN=0, e.g. when an external cron calls
 * POST /api/keeper/tick). It goes through the HTTP route rather than importing the keeper directly, so it always runs
 * the current code (instrumentation's module graph is not hot-reloaded in dev).
 */
export function startKeeperLoop() {
  // Serverless (Vercel) has no long-lived process: an external scheduler calls the tick route instead.
  if (g.__reachpotLoop || process.env.VERCEL || process.env.KEEPER_AUTORUN === '0' || !serverEnv.keeperSecret) return;
  const url = `${process.env.KEEPER_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`}/api/keeper/tick`;
  let lastError = '';
  g.__reachpotLoop = setInterval(async () => {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'x-keeper-secret': serverEnv.keeperSecret! } });
      const body = (await res.json()) as { error?: string; campaigns?: { id: number; error?: string }[] };
      const err = body.error ?? body.campaigns?.find((c) => c.error)?.error ?? '';
      if (err && err !== lastError) console.warn(`[reachpot] keeper: ${err}`);
      lastError = err;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== lastError) console.warn(`[reachpot] keeper unreachable: ${msg}`);
      lastError = msg;
    }
  }, serverEnv.keeperIntervalMs);
  console.log(`[reachpot] keeper loop every ${serverEnv.keeperIntervalMs}ms → ${url}`);
}
