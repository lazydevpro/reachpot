import { connection } from 'next/server';
import { creatorDashboard } from '@/lib/server/creators';
import { handle } from '@/lib/server/http';

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  await connection();
  return handle(async () => creatorDashboard((await ctx.params).address));
}
