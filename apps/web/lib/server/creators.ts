import { and, eq, inArray } from 'drizzle-orm';
import type { Address } from 'viem';
import { assetBalance, freeBalance, h160OfAccount, isMapped, normalizeSs58 } from '@reachpot/core/native';
import type { CreatorDashboard } from '@/lib/shared/protocol';
import { HttpError, toSubmissionView } from './campaigns';
import { nativeApi } from './chain';
import { db, schema } from './db';
import { deployment } from './env';

export async function creatorDashboard(address: string): Promise<CreatorDashboard> {
  let creator: string;
  try {
    creator = normalizeSs58(address);
  } catch {
    throw new HttpError(400, 'invalid Portaldot address');
  }
  const dep = deployment();
  const contract = dep.reachpot.address.toLowerCase();
  const api = await nativeApi();
  const [payoutH160, mapped, free] = await Promise.all([h160OfAccount(api, creator), isMapped(api, creator), freeBalance(api, creator)]);
  const balances = await Promise.all(
    dep.assets.map(async (a) => ({ assetId: a.id, symbol: a.symbol, decimals: a.decimals, amount: (await assetBalance(api, a.id, creator)).toString() })),
  );

  const d = await db();
  const camps = await d.select().from(schema.campaigns).where(eq(schema.campaigns.contract, contract));
  const byId = new Map(camps.map((c) => [c.campaignId, c]));
  const subs = await d.select().from(schema.submissions).where(and(eq(schema.submissions.contract, contract), eq(schema.submissions.creator, creator)));
  const accounts = [...new Set([payoutH160.toLowerCase(), ...subs.map((s) => s.payoutH160)])];
  const pays = await d.select().from(schema.payouts).where(and(eq(schema.payouts.contract, contract), inArray(schema.payouts.account, accounts)));

  const [badgeRow] = await d
    .select()
    .from(schema.badges)
    .where(and(eq(schema.badges.collection, dep.badges.collection), eq(schema.badges.creator, creator)));
  let badge: CreatorDashboard['badge'] = null;
  if (badgeRow) {
    const attr = await api.query.nfts.attribute(dep.badges.collection, badgeRow.item, { CollectionOwner: null }, 'stats');
    const raw = attr.isSome ? attr.unwrap()[0].toUtf8() : '';
    const [campaigns = '0', views = '0', earned = ''] = raw.split('|');
    badge = { collection: dep.badges.collection, item: badgeRow.item, attributes: { campaigns, views, earned }, mintTx: badgeRow.mintTx };
  }

  return {
    creator,
    payoutH160: payoutH160 as Address,
    mapped,
    native: { free: free.toString() },
    balances,
    submissions: subs.map((s) => ({
      ...toSubmissionView(s),
      campaignId: s.campaignId,
      campaignTitle: byId.get(s.campaignId)?.title ?? `Campaign #${s.campaignId}`,
      tokenSymbol: byId.get(s.campaignId)?.tokenSymbol ?? '',
    })),
    payouts: pays.map((p) => ({
      account: p.account as Address,
      creator,
      amount: p.amount,
      status: p.status,
      txHash: p.txHash,
      createdAt: p.createdAt.toISOString(),
      campaignId: p.campaignId,
      campaignTitle: byId.get(p.campaignId)?.title ?? `Campaign #${p.campaignId}`,
      tokenSymbol: byId.get(p.campaignId)?.tokenSymbol ?? '',
      tokenDecimals: byId.get(p.campaignId)?.tokenDecimals ?? 0,
    })),
    badge,
  };
}
