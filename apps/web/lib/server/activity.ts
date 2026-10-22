import { db, schema } from './db';
import { deployment } from './env';

export async function logActivity(campaignId: number, kind: string, message: string, tx?: string | null) {
  const d = await db();
  await d.insert(schema.activity).values({ contract: deployment().reachpot.address.toLowerCase(), campaignId, kind, message, tx: tx ?? null });
  console.log(`[reachpot] #${campaignId} ${kind}: ${message}${tx ? ` (${tx})` : ''}`);
}
