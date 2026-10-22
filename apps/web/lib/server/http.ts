import { HttpError } from './campaigns';

/** JSON route helper: bigint-safe serialization and HttpError → status mapping. */
export async function handle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    const data = await fn();
    return new Response(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error('[reachpot] api error', e);
    return Response.json({ error: (e as Error).message }, { status });
  }
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'invalid JSON body');
  }
}
