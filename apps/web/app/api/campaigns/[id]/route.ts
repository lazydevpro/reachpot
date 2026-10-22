import { connection } from 'next/server';
import { HttpError, getCampaign } from '@/lib/server/campaigns';
import { handle } from '@/lib/server/http';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  return handle(async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'bad campaign id');
    return getCampaign(id);
  });
}
