import { z } from 'zod';
import { HttpError } from '@/lib/server/campaigns';
import { body, handle } from '@/lib/server/http';
import { submitShort } from '@/lib/server/submissions';

const Submit = z.object({
  campaignId: z.number().int().positive(),
  videoUrl: z.string().min(5).max(300),
  creator: z.string().min(40).max(60),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = Submit.safeParse(await body(req));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    return submitShort(parsed.data);
  });
}
