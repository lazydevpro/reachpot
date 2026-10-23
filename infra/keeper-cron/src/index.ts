// One Durable Object runs an alarm loop: every INTERVAL_SECONDS it POSTs the deployed app's /api/keeper/tick.
// Each alarm schedules the next one before ticking, so a failed tick never breaks the chain, and alarms on one object
// never overlap. The app also holds a lease in Postgres, so the daily Vercel Cron backstop can't overlap either.
// Any request to the Worker makes sure the loop is running and returns its status (no secrets in it).

interface Env {
  KEEPER_URL: string;
  KEEPER_SECRET: string;
  INTERVAL_SECONDS?: string;
  TICKER: { idFromName(name: string): unknown; get(id: unknown): { fetch(req: Request): Promise<Response> } };
}

interface DurableObjectState {
  storage: {
    getAlarm(): Promise<number | null>;
    setAlarm(at: number): Promise<void>;
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
  };
}

interface LastTick {
  at: string;
  status: number;
  ms: number;
  body: string;
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return env.TICKER.get(env.TICKER.idFromName('keeper')).fetch(req);
  },
};

export class KeeperTicker {
  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}

  /** Starts the loop if it isn't scheduled, then reports it. */
  async fetch(): Promise<Response> {
    if ((await this.state.storage.getAlarm()) === null) await this.state.storage.setAlarm(Date.now() + 1_000);
    const next = await this.state.storage.getAlarm();
    return Response.json({
      keeper: `${this.env.KEEPER_URL}/api/keeper/tick`,
      everySeconds: this.interval(),
      nextTickAt: next ? new Date(next).toISOString() : null,
      last: (await this.state.storage.get<LastTick>('last')) ?? null,
    });
  }

  async alarm(): Promise<void> {
    await this.state.storage.setAlarm(Date.now() + this.interval() * 1_000);
    const started = Date.now();
    let last: LastTick;
    try {
      const res = await fetch(`${this.env.KEEPER_URL}/api/keeper/tick`, {
        method: 'POST',
        headers: { 'x-keeper-secret': this.env.KEEPER_SECRET },
        signal: AbortSignal.timeout(295_000),
      });
      last = { at: new Date(started).toISOString(), status: res.status, ms: Date.now() - started, body: (await res.text()).slice(0, 1_000) };
    } catch (e) {
      last = { at: new Date(started).toISOString(), status: 0, ms: Date.now() - started, body: String(e) };
    }
    console.log(`keeper tick ${last.status} in ${last.ms} ms: ${last.body}`);
    await this.state.storage.put('last', last);
  }

  private interval(): number {
    return Math.max(30, Number(this.env.INTERVAL_SECONDS ?? 60));
  }
}
