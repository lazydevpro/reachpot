import { connection } from 'next/server';
import { getSnapshotJson } from '@/lib/server/campaigns';

/** The exact snapshot bytes that were stored in TransactionStorage (cached copy for verifiers). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  const json = await getSnapshotJson(Number((await ctx.params).id));
  if (!json) return Response.json({ error: 'no snapshot yet' }, { status: 404 });
  return new Response(json, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
