import { connection } from 'next/server';
import { z } from 'zod';
import { HttpError, listCampaigns, registerCampaign } from '@/lib/server/campaigns';
import { body, handle } from '@/lib/server/http';

export async function GET() {
  await connection();
  return handle(() => listCampaigns());
}

const Register = z.object({
  campaignId: z.number().int().positive(),
  createTx: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  rules: z.object({
    title: z.string().min(3).max(80),
    brief: z.string().min(10).max(1200),
    brandName: z.string().min(1).max(40),
    platform: z.literal('youtube-shorts'),
    minViews: z.string().regex(/^\d+$/),
  }),
});

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = Register.safeParse(await body(req));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    return registerCampaign({ ...parsed.data, createTx: parsed.data.createTx as `0x${string}` });
  });
}
