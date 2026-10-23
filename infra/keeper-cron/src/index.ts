// Every minute, POST the deployed app's /api/keeper/tick. Overlap is safe: the app holds a lease in Postgres and answers
// `skipped` while another tick (which can take minutes on testnet) is still running.
interface Env {
  KEEPER_URL: string;
  KEEPER_SECRET: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(tick(env));
  },
};

async function tick(env: Env): Promise<void> {
  const res = await fetch(`${env.KEEPER_URL}/api/keeper/tick`, { method: 'POST', headers: { 'x-keeper-secret': env.KEEPER_SECRET } });
  const body = await res.text();
  console.log(`keeper tick ${res.status}: ${body.slice(0, 1000)}`);
  if (!res.ok) throw new Error(`keeper tick failed with ${res.status}`);
}
