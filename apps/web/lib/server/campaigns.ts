import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { erc20Abi, type Address, type Hex } from 'viem';
import { assetIdFromPrecompile, reachpotAbi } from '@reachpot/core';
import { rulesHash, type CampaignDetail, type CampaignRules, type CampaignSummary, type SubmissionView } from '@/lib/shared/protocol';
import { logActivity } from './activity';
import { nativeApi, publicClient, readCampaign, isZeroHash, type OnchainCampaign } from './chain';
import { db, schema } from './db';
import { deployment } from './env';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const contractKey = () => deployment().reachpot.address.toLowerCase();

export async function tokenInfo(token: Address): Promise<{ symbol: string; decimals: number; assetId: number | null }> {
  const assetId = assetIdFromPrecompile(token) ?? null;
  const known = deployment().assets.find((a) => a.precompile.toLowerCase() === token.toLowerCase());
  if (known) return { symbol: known.symbol, decimals: known.decimals, assetId };
  if (assetId !== null) {
    const api = await nativeApi();
    const m = await api.query.assets.metadata(assetId);
    return { symbol: m.symbol.toUtf8() || `#${assetId}`, decimals: m.decimals.toNumber(), assetId };
  }
  const [symbol, decimals] = await Promise.all([
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
  ]);
  return { symbol, decimals, assetId: null };
}

/** Attach off-chain rules to an on-chain campaign. The rules must hash to the `rulesHash` pinned at creation. */
export async function registerCampaign(input: { campaignId: number; createTx: Hex; rules: CampaignRules }) {
  const oc = await readCampaign(input.campaignId);
  if (!oc) throw new HttpError(404, `campaign ${input.campaignId} does not exist on-chain`);
  if (rulesHash(input.rules) !== oc.rulesHash) throw new HttpError(400, 'rules do not match the on-chain rulesHash');
  if (BigInt(input.rules.minViews) !== oc.minViews) throw new HttpError(400, 'minViews does not match the on-chain campaign');

  const receipt = await publicClient.getTransactionReceipt({ hash: input.createTx }).catch(() => null);
  if (!receipt || receipt.status !== 'success' || receipt.to?.toLowerCase() !== contractKey()) {
    throw new HttpError(400, 'createTx is not a successful Reachpot transaction');
  }

  const t = await tokenInfo(oc.token);
  const d = await db();
  await d
    .insert(schema.campaigns)
    .values({
      contract: contractKey(),
      campaignId: input.campaignId,
      title: input.rules.title.trim(),
      brief: input.rules.brief.trim(),
      brandName: input.rules.brandName.trim(),
      brand: oc.brand.toLowerCase(),
      token: oc.token.toLowerCase(),
      tokenSymbol: t.symbol,
      tokenDecimals: t.decimals,
      assetId: t.assetId,
      rulesHash: oc.rulesHash,
      minViews: oc.minViews.toString(),
      createTx: input.createTx,
    })
    .onConflictDoNothing();
  await logActivity(input.campaignId, 'created', `${input.rules.brandName} locked ${oc.pool} base units of ${t.symbol}`, input.createTx);
  return { ok: true };
}

type Row = typeof schema.campaigns.$inferSelect;

async function stats(campaignIds: number[]) {
  if (campaignIds.length === 0) return new Map<number, { creators: number; submissions: number; views: bigint }>();
  const d = await db();
  const rows = await d
    .select({
      campaignId: schema.submissions.campaignId,
      creators: sql<number>`count(distinct ${schema.submissions.creator})`,
      submissions: sql<number>`count(*)`,
      views: sql<string>`coalesce(sum((${schema.submissions.views})::numeric) filter (where ${schema.submissions.status} = 'verified'), 0)::text`,
    })
    .from(schema.submissions)
    .where(eq(schema.submissions.contract, contractKey()))
    .groupBy(schema.submissions.campaignId);
  return new Map(rows.map((r) => [r.campaignId, { creators: Number(r.creators), submissions: Number(r.submissions), views: BigInt(r.views.split('.')[0]) }]));
}

function summary(row: Row, oc: OnchainCampaign, s?: { creators: number; submissions: number; views: bigint }): CampaignSummary {
  return {
    id: row.campaignId,
    title: row.title,
    brandName: row.brandName,
    brand: oc.brand,
    token: { address: oc.token, symbol: row.tokenSymbol, decimals: row.tokenDecimals, assetId: row.assetId },
    pool: oc.pool.toString(),
    capPerCreator: oc.capPerCreator.toString(),
    minViews: oc.minViews.toString(),
    start: oc.start,
    end: oc.end,
    measurementDelay: oc.measurementDelay,
    status: oc.status,
    creators: s?.creators ?? 0,
    submissions: s?.submissions ?? 0,
    totalViews: (s?.views ?? 0n).toString(),
  };
}

export async function listCampaigns(): Promise<CampaignSummary[]> {
  const d = await db();
  const rows = await d.select().from(schema.campaigns).where(eq(schema.campaigns.contract, contractKey())).orderBy(desc(schema.campaigns.campaignId));
  const st = await stats(rows.map((r) => r.campaignId));
  const out = await Promise.all(
    rows.map(async (r) => {
      const oc = await readCampaign(r.campaignId);
      return oc ? summary(r, oc, st.get(r.campaignId)) : null;
    }),
  );
  return out.filter((x): x is CampaignSummary => x !== null);
}

export function toSubmissionView(s: typeof schema.submissions.$inferSelect): SubmissionView {
  return {
    id: s.id,
    videoId: s.videoId,
    videoUrl: s.videoUrl,
    title: s.title,
    creator: s.creator,
    payoutH160: s.payoutH160 as Address,
    status: s.status,
    rejectReason: s.rejectReason,
    views: s.views,
    viewsUpdatedAt: s.viewsUpdatedAt?.toISOString() ?? null,
    bindingCode: s.bindingCode,
    createdAt: s.createdAt.toISOString(),
  };
}

export async function getCampaign(id: number): Promise<CampaignDetail> {
  const d = await db();
  const key = contractKey();
  const [row] = await d.select().from(schema.campaigns).where(and(eq(schema.campaigns.contract, key), eq(schema.campaigns.campaignId, id)));
  if (!row) throw new HttpError(404, `campaign ${id} not found`);
  const oc = await readCampaign(id);
  if (!oc) throw new HttpError(404, `campaign ${id} not found on-chain`);

  const [subs, snaps, pays, acts, st] = await Promise.all([
    d.select().from(schema.submissions).where(and(eq(schema.submissions.contract, key), eq(schema.submissions.campaignId, id))).orderBy(asc(schema.submissions.createdAt)),
    d.select().from(schema.snapshots).where(and(eq(schema.snapshots.contract, key), eq(schema.snapshots.campaignId, id))),
    d.select().from(schema.payouts).where(and(eq(schema.payouts.contract, key), eq(schema.payouts.campaignId, id))).orderBy(asc(schema.payouts.createdAt)),
    d.select().from(schema.activity).where(and(eq(schema.activity.contract, key), eq(schema.activity.campaignId, id))).orderBy(desc(schema.activity.at)).limit(50),
    stats([id]),
  ]);
  const creatorOf = new Map(subs.map((s) => [s.payoutH160.toLowerCase(), s.creator]));
  const snap = snaps[0];

  return {
    ...summary(row, oc, st.get(id)),
    brief: row.brief,
    rulesHash: oc.rulesHash,
    createTx: row.createTx,
    root: isZeroHash(oc.root) ? null : oc.root,
    rootPostedAt: oc.rootPostedAt,
    totalAllocated: oc.totalAllocated.toString(),
    claimed: oc.claimed.toString(),
    refunded: oc.refunded.toString(),
    refundable: oc.refundable.toString(),
    snapshot: snap
      ? {
          hash: snap.hash as Hex,
          block: snap.block,
          index: snap.extrinsicIndex,
          storeTx: snap.storeTx,
          root: snap.root as Hex,
          rootTx: snap.rootTx ?? '',
          totalAllocated: snap.totalAllocated,
          createdAt: snap.createdAt.toISOString(),
        }
      : null,
    submissionsList: subs.map(toSubmissionView),
    payouts: pays.map((p) => ({
      account: p.account as Address,
      creator: creatorOf.get(p.account.toLowerCase()) ?? null,
      amount: p.amount,
      status: p.status,
      txHash: p.txHash,
      createdAt: p.createdAt.toISOString(),
    })),
    activity: acts.map((a) => ({ at: a.at.toISOString(), kind: a.kind, message: a.message, tx: a.tx })),
  };
}

export async function getSnapshotJson(id: number): Promise<string | null> {
  const d = await db();
  const [snap] = await d.select().from(schema.snapshots).where(and(eq(schema.snapshots.contract, contractKey()), eq(schema.snapshots.campaignId, id)));
  return snap?.json ?? null;
}

export { reachpotAbi };
