import { z } from 'zod';
import { HttpError } from '@/lib/server/campaigns';
import { serverEnv } from '@/lib/server/env';
import { body, handle } from '@/lib/server/http';
import { setViews } from '@/lib/server/submissions';

const SetViews = z.object({ campaignId: z.number().int().positive(), videoId: z.string(), views: z.string().regex(/^\d+$/) });

/** Local demo only: override a Short's view count (the mock view source otherwise grows views over time). */
export async function POST(req: Request) {
  return handle(async () => {
    if (!serverEnv.devTools) throw new HttpError(404, 'not found');
    const p = SetViews.safeParse(await body(req));
    if (!p.success) throw new HttpError(400, 'campaignId, videoId, views required');
    return setViews(p.data.campaignId, p.data.videoId, BigInt(p.data.views));
  });
}
