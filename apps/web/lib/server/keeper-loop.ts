import { serverEnv } from './env';
import { keeperTick } from './keeper';

const g = globalThis as unknown as { __reachpotLoop?: ReturnType<typeof setInterval> };

/** Background keeper inside the Next server process (disable with KEEPER_AUTORUN=0, e.g. when an external cron runs it). */
export function startKeeperLoop() {
  if (g.__reachpotLoop || process.env.KEEPER_AUTORUN === '0') return;
  let lastError = '';
  g.__reachpotLoop = setInterval(() => {
    keeperTick()
      .then(() => (lastError = ''))
      .catch((e) => {
        const msg = (e as Error).message;
        if (msg !== lastError) console.warn(`[reachpot] keeper idle: ${msg}`);
        lastError = msg;
      });
  }, serverEnv.keeperIntervalMs);
  console.log(`[reachpot] keeper loop every ${serverEnv.keeperIntervalMs}ms on ${serverEnv.network.label}`);
}
