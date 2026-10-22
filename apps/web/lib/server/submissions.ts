import { and, eq } from 'drizzle-orm';
import { u8aWrapBytes } from '@polkadot/util';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import { CampaignStatus } from '@reachpot/core';
import { h160OfAccount, isMapped, normalizeSs58 } from '@reachpot/core/native';
import { bindingCode, parseVideoId, submissionMessage } from '@/lib/shared/protocol';
import { logActivity } from './activity';
import { HttpError, toSubmissionView } from './campaigns';
import { nativeApi, readCampaign } from './chain';
import { db, schema } from './db';
import { deployment, serverEnv } from './env';
import { MAX_SHORT_SECONDS, fetchYouTube, mockTitle, mockViews } from './youtube';

function verifySignature(message: string, signature: string, address: string): boolean {
  const raw = new TextEncoder().encode(message);
  // Browser extensions sign `<Bytes>…</Bytes>`-wrapped payloads; in-app keyrings sign the raw bytes.
  return [raw, u8aWrapBytes(raw)].some((m) => {
    try {
      return signatureVerify(m, signature, address).isValid;
    } catch {
      return false;
    }
  });
}

export async function submitShort(input: { campaignId: number; videoUrl: string; creator: string; signature: string }) {
  await cryptoWaitReady();
  const contract = deployment().reachpot.address;
  const oc = await readCampaign(input.campaignId);
  if (!oc) throw new HttpError(404, 'campaign not found');
  if (oc.status !== CampaignStatus.Open) throw new HttpError(409, 'this campaign is not accepting submissions');

  const videoId = parseVideoId(input.videoUrl);
  if (!videoId) throw new HttpError(400, 'paste a YouTube Shorts link (youtube.com/shorts/…)');

  let creator: string;
  try {
    creator = normalizeSs58(input.creator);
  } catch {
    throw new HttpError(400, 'invalid Portaldot address');
  }
  const message = submissionMessage({ contract, campaignId: input.campaignId, videoId, creator });
  if (!verifySignature(message, input.signature, creator)) throw new HttpError(401, 'signature does not match this wallet');

  const api = await nativeApi();
  if (!(await isMapped(api, creator))) {
    throw new HttpError(412, 'enable payouts first: your Portaldot account must be mapped for EVM payouts (revive.mapAccount)');
  }
  const payoutH160 = await h160OfAccount(api, creator);
  const code = bindingCode(contract, input.campaignId, creator);

  let status: 'pending' | 'verified' | 'rejected' = 'pending';
  let title: string | null = null;
  let views = 0n;
  let rejectReason: string | null = null;
  if (serverEnv.viewsSource === 'mock') {
    status = 'verified';
    title = mockTitle(videoId);
    views = mockViews(videoId, new Date());
  } else {
    const info = (await fetchYouTube([videoId])).get(videoId);
    if (!info) throw new HttpError(404, 'video not found or private');
    title = info.title;
    views = info.views;
    if (info.durationSec > MAX_SHORT_SECONDS) {
      status = 'rejected';
      rejectReason = 'not a Short (longer than 3 minutes)';
    } else if (info.publishedAt.getTime() / 1000 < oc.start - 86_400) {
      status = 'rejected';
      rejectReason = 'published before the campaign started';
    } else if (info.description.includes(code)) {
      status = 'verified';
    }
  }

  const d = await db();
  const inserted = await d
    .insert(schema.submissions)
    .values({
      contract: contract.toLowerCase(),
      campaignId: input.campaignId,
      videoId,
      videoUrl: `https://youtube.com/shorts/${videoId}`,
      title,
      creator,
      payoutH160: payoutH160.toLowerCase(),
      bindingCode: code,
      signature: input.signature,
      status,
      rejectReason,
      views: views.toString(),
      viewsUpdatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) throw new HttpError(409, 'this Short was already submitted to this campaign');
  await logActivity(input.campaignId, 'submission', `${creator.slice(0, 6)}… submitted ${videoId} (${status})`);
  return toSubmissionView(inserted[0]);
}

/** Local demo only: set a submission's view count directly. */
export async function setViews(campaignId: number, videoId: string, views: bigint) {
  const d = await db();
  const res = await d
    .update(schema.submissions)
    .set({ views: views.toString(), viewsPinned: true, viewsUpdatedAt: new Date() })
    .where(
      and(
        eq(schema.submissions.contract, deployment().reachpot.address.toLowerCase()),
        eq(schema.submissions.campaignId, campaignId),
        eq(schema.submissions.videoId, videoId),
      ),
    )
    .returning();
  if (res.length === 0) throw new HttpError(404, 'submission not found');
  return toSubmissionView(res[0]);
}

export { h160OfAccount };
