// The oracle/keeper: refreshes views, publishes the snapshot to TransactionStorage, posts the payout root, pushes
// payouts, and keeps creator badges up to date. Runs every few seconds (instrumentation.ts) or via POST /api/keeper/tick.
import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { bytesToHex, parseEventLogs, type Address, type Hex } from 'viem';
import { CampaignStatus, fmtUnits, reachpotAbi } from '@reachpot/core';
import { accountOfH160, sendNative } from '@reachpot/core/native';
import { blake2AsU8a, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { EMPTY_ROOT, buildSnapshot, buildTree, eligibleTotals, serializeSnapshot, snapshotHash, type Snapshot } from '@reachpot/allocation';
import { logActivity } from './activity';
import { nativeAdmin, nativeApi, oracleWallet, publicClient, readCampaign, isZeroHash, type OnchainCampaign } from './chain';
import { db, schema } from './db';
import { acquireKeeperLease, releaseKeeperLease } from './keeper-lease';
import { deployment, network, serverEnv } from './env';
import { fetchYouTube, mockViews } from './youtube';

type CampaignRow = typeof schema.campaigns.$inferSelect;

const PAYOUT_BATCH = 15;

const g = globalThis as unknown as { __reachpotTick?: Promise<TickReport>; __reachpotViewsAt?: Map<number, number> };

export interface TickReport {
  at: string;
  /** Set when another instance holds the keeper lease; this call did nothing. */
  skipped?: string;
  campaigns: { id: number; status: string; actions: string[]; error?: string }[];
}

/** A tick may run up to the route's maxDuration (300 s); the lease outlives it so a killed tick frees it soon after. */
const LEASE_SECONDS = 330;

/** Single-flight: overlapping calls share the running tick; across instances, the keeper lease keeps ticks apart. */
export function keeperTick(): Promise<TickReport> {
  g.__reachpotTick ??= leasedTick().finally(() => (g.__reachpotTick = undefined));
  return g.__reachpotTick;
}

async function leasedTick(): Promise<TickReport> {
  const d = await db();
  const holder = randomUUID();
  if (!(await acquireKeeperLease(d, holder, LEASE_SECONDS))) {
    return { at: new Date().toISOString(), skipped: 'another keeper tick is running', campaigns: [] };
  }
  try {
    return await runTick();
  } finally {
    await releaseKeeperLease(d, holder).catch((e) => console.error('[reachpot] keeper lease release:', e));
  }
}

async function runTick(): Promise<TickReport> {
  const d = await db();
  const contract = deployment().reachpot.address.toLowerCase();
  const rows = await d.select().from(schema.campaigns).where(and(eq(schema.campaigns.contract, contract), isNull(schema.campaigns.paidOutAt)));
  const report: TickReport = { at: new Date().toISOString(), campaigns: [] };
  for (const row of rows) {
    const entry = { id: row.campaignId, status: '', actions: [] as string[], error: undefined as string | undefined };
    report.campaigns.push(entry);
    try {
      const oc = await readCampaign(row.campaignId);
      if (!oc) continue;
      entry.status = CampaignStatus[oc.status];
      switch (oc.status) {
        case CampaignStatus.Open:
        case CampaignStatus.Measuring:
          if (await refreshViews(row, false)) entry.actions.push('views refreshed');
          break;
        case CampaignStatus.AwaitingRoot:
          await refreshViews(row, true);
          entry.actions.push(...(await snapshotAndPostRoot(row, oc)));
          break;
        case CampaignStatus.Payable:
          entry.actions.push(...(await payAll(row, oc)));
          break;
        case CampaignStatus.Expired:
        case CampaignStatus.Abandoned:
          await d.update(schema.campaigns).set({ paidOutAt: new Date() }).where(and(eq(schema.campaigns.contract, contract), eq(schema.campaigns.campaignId, row.campaignId)));
          break;
      }
    } catch (e) {
      entry.error = (e as Error).message;
      console.error(`[reachpot] keeper #${row.campaignId}:`, e);
    }
  }
  return report;
}

// ------------------------------------------------------------------ views

async function refreshViews(row: CampaignRow, force: boolean): Promise<boolean> {
  g.__reachpotViewsAt ??= new Map();
  const minGap = serverEnv.viewsSource === 'mock' ? 5_000 : network.name === 'local' ? 30_000 : 10 * 60_000;
  const last = g.__reachpotViewsAt.get(row.campaignId) ?? 0;
  if (!force && Date.now() - last < minGap) return false;
  g.__reachpotViewsAt.set(row.campaignId, Date.now());

  const d = await db();
  const subs = await d
    .select()
    .from(schema.submissions)
    .where(and(eq(schema.submissions.contract, row.contract), eq(schema.submissions.campaignId, row.campaignId)));
  const live = subs.filter((s) => s.status !== 'rejected');
  if (live.length === 0) return false;

  if (serverEnv.viewsSource === 'mock') {
    for (const s of live) {
      if (s.viewsPinned) continue;
      const v = mockViews(s.videoId, s.createdAt);
      if (v > BigInt(s.views)) await d.update(schema.submissions).set({ views: v.toString(), viewsUpdatedAt: new Date() }).where(eq(schema.submissions.id, s.id));
    }
    return true;
  }

  const info = await fetchYouTube(live.map((s) => s.videoId));
  for (const s of live) {
    const v = info.get(s.videoId);
    if (!v) {
      await d.update(schema.submissions).set({ status: 'rejected', rejectReason: 'video no longer available' }).where(eq(schema.submissions.id, s.id));
      continue;
    }
    const verified = s.status === 'verified' || v.description.includes(s.bindingCode);
    await d
      .update(schema.submissions)
      .set({
        views: v.views.toString(),
        viewsUpdatedAt: new Date(),
        status: verified ? 'verified' : force ? 'rejected' : 'pending',
        rejectReason: verified ? null : force ? `binding code ${s.bindingCode} not found in the description` : null,
        title: v.title,
      })
      .where(eq(schema.submissions.id, s.id));
  }
  return true;
}

// -------------------------------------------------------- snapshot + root

async function snapshotAndPostRoot(row: CampaignRow, oc: OnchainCampaign): Promise<string[]> {
  const actions: string[] = [];
  const d = await db();
  const [existing] = await d.select().from(schema.snapshots).where(and(eq(schema.snapshots.contract, row.contract), eq(schema.snapshots.campaignId, row.campaignId)));

  if (existing?.rootTx) {
    // A root was posted and is gone from the contract: the guardian cancelled it. Needs a human.
    actions.push('root was cancelled by the guardian; waiting for manual review');
    return actions;
  }

  let snap = existing;
  if (!snap) {
    const subs = await d
      .select()
      .from(schema.submissions)
      .where(and(eq(schema.submissions.contract, row.contract), eq(schema.submissions.campaignId, row.campaignId), eq(schema.submissions.status, 'verified')));
    const creators = eligibleTotals(
      subs.map((s) => ({ account: s.payoutH160, views: BigInt(s.views) })),
      oc.minViews,
    );
    // With no eligible creators this publishes an empty snapshot whose sentinel root lets the brand refund promptly.
    const json: Snapshot = buildSnapshot({
      chainId: network.chainId,
      contract: row.contract,
      campaignId: BigInt(row.campaignId),
      token: oc.token,
      pool: oc.pool,
      capPerCreator: oc.capPerCreator,
      minViews: oc.minViews,
      takenAt: new Date(),
      creators,
    });
    const bytes = serializeSnapshot(json);
    const hash = snapshotHash(bytes);
    const api = await nativeApi();
    const admin = await nativeAdmin();
    const stored = await sendNative(api, api.tx.transactionStorage.store(bytesToHex(bytes)), admin); // hex: a raw Uint8Array would be read as SCALE-prefixed
    [snap] = await d
      .insert(schema.snapshots)
      .values({
        contract: row.contract,
        campaignId: row.campaignId,
        json: new TextDecoder().decode(bytes),
        hash,
        block: stored.blockNumber,
        extrinsicIndex: stored.extrinsicIndex,
        storeTx: stored.txHash,
        root: json.root,
        totalAllocated: json.totalAllocated,
      })
      .returning();
    await logActivity(row.campaignId, 'snapshot', `Snapshot of ${creators.length} creators stored on-chain at block #${stored.blockNumber} (TransactionStorage)`, stored.txHash);
    actions.push(`snapshot stored #${stored.blockNumber}-${stored.extrinsicIndex}`);
  }

  const wallet = oracleWallet();
  const { request } = await publicClient.simulateContract({
    account: wallet.account,
    address: deployment().reachpot.address,
    abi: reachpotAbi,
    functionName: 'postRoot',
    args: [BigInt(row.campaignId), snap.root as Hex, BigInt(snap.totalAllocated), snap.hash as Hex, snap.block, snap.extrinsicIndex],
  });
  const tx = await wallet.writeContract(request);
  const rcpt = await publicClient.waitForTransactionReceipt({ hash: tx });
  if (rcpt.status !== 'success') throw new Error(`postRoot reverted: ${tx}`);
  await d.update(schema.snapshots).set({ rootTx: tx }).where(and(eq(schema.snapshots.contract, row.contract), eq(schema.snapshots.campaignId, row.campaignId)));
  await logActivity(
    row.campaignId,
    'root',
    `Payout root posted: ${fmtUnits(BigInt(snap.totalAllocated), row.tokenDecimals)} ${row.tokenSymbol} allocated; dispute window open`,
    tx,
  );
  actions.push('root posted');
  return actions;
}

// ------------------------------------------------------------------ payouts

async function payAll(row: CampaignRow, oc: OnchainCampaign): Promise<string[]> {
  const actions: string[] = [];
  const d = await db();
  const [snap] = await d.select().from(schema.snapshots).where(and(eq(schema.snapshots.contract, row.contract), eq(schema.snapshots.campaignId, row.campaignId)));
  if (!snap || isZeroHash(oc.root) || oc.root === EMPTY_ROOT || snap.root.toLowerCase() !== oc.root.toLowerCase()) {
    if (oc.root === EMPTY_ROOT) await markPaidOut(row);
    return actions;
  }
  const s = JSON.parse(snap.json) as Snapshot;
  const allocations = s.allocations.map((a) => ({ account: a.account as Address, amount: BigInt(a.amount) }));
  const { payouts } = buildTree(allocations);

  const address = deployment().reachpot.address;
  const paidFlags = await Promise.all(
    payouts.map((p) => publicClient.readContract({ address, abi: reachpotAbi, functionName: 'isPaid', args: [BigInt(row.campaignId), p.account] })),
  );
  const pending = payouts.filter((_, i) => !paidFlags[i]);
  if (pending.length === 0) {
    await updateBadges(row);
    await markPaidOut(row);
    actions.push('all paid; badges updated');
    return actions;
  }

  // Native-asset recipients need an existing native account (>= ED) or the precompile transfer fails.
  if (row.assetId !== null) actions.push(...(await topUpRecipients(row, pending.map((p) => p.account))));

  const wallet = oracleWallet();
  for (let i = 0; i < pending.length; i += PAYOUT_BATCH) {
    const batch = pending.slice(i, i + PAYOUT_BATCH);
    const { request } = await publicClient.simulateContract({
      account: wallet.account,
      address,
      abi: reachpotAbi,
      functionName: 'payoutMany',
      args: [BigInt(row.campaignId), batch.map((p) => ({ account: p.account, amount: p.amount, proof: p.proof }))],
    });
    const tx = await wallet.writeContract(request);
    const rcpt = await publicClient.waitForTransactionReceipt({ hash: tx });
    if (rcpt.status !== 'success') throw new Error(`payoutMany reverted: ${tx}`);
    const logs = parseEventLogs({ abi: reachpotAbi, logs: rcpt.logs });
    let paid = 0n;
    let ok = 0;
    for (const l of logs) {
      if (l.eventName === 'Paid' || l.eventName === 'PayoutFailed') {
        const a = l.args as { account: Address; amount: bigint };
        await d.insert(schema.payouts).values({
          contract: row.contract,
          campaignId: row.campaignId,
          account: a.account.toLowerCase(),
          amount: a.amount.toString(),
          status: l.eventName === 'Paid' ? 'paid' : 'failed',
          txHash: tx,
        });
        if (l.eventName === 'Paid') {
          paid += a.amount;
          ok++;
        }
      }
    }
    await logActivity(row.campaignId, 'payout', `Paid ${ok}/${batch.length} creators · ${fmtUnits(paid, row.tokenDecimals)} ${row.tokenSymbol}`, tx);
    actions.push(`payoutMany ${ok}/${batch.length}`);
  }
  return actions;
}

async function topUpRecipients(row: CampaignRow, accounts: Address[]): Promise<string[]> {
  const api = await nativeApi();
  const admin = await nativeAdmin();
  const ed = api.consts.balances.existentialDeposit.toBigInt();
  const transfers = [];
  for (const h160 of accounts) {
    const who = await accountOfH160(api, h160);
    const acct = await api.query.system.account(who);
    if (acct.providers.toNumber() === 0 && acct.data.free.toBigInt() < ed) transfers.push(api.tx.balances.transferKeepAlive(who, ed * 2n));
  }
  if (transfers.length === 0) return [];
  const r = await sendNative(api, api.tx.utility.batchAll(transfers), admin);
  await logActivity(row.campaignId, 'topup', `Sponsored the existential deposit for ${transfers.length} new creator account(s)`, r.txHash);
  return [`topped up ${transfers.length}`];
}

async function markPaidOut(row: CampaignRow) {
  const d = await db();
  await d.update(schema.campaigns).set({ paidOutAt: new Date() }).where(and(eq(schema.campaigns.contract, row.contract), eq(schema.campaigns.campaignId, row.campaignId)));
}

// ------------------------------------------------------------------ badges

/** One compact attribute keeps the testnet deposit low: `stats` = "campaigns|views|earned". */
export function badgeStatsValue(campaigns: number, views: bigint, earned: string): string {
  return `${campaigns}|${views}|${earned}`;
}

async function updateBadges(row: CampaignRow) {
  const d = await db();
  const dep = deployment();
  const collection = dep.badges.collection;
  const subs = await d
    .select({ creator: schema.submissions.creator, h160: schema.submissions.payoutH160 })
    .from(schema.submissions)
    .where(and(eq(schema.submissions.contract, row.contract), eq(schema.submissions.campaignId, row.campaignId)));
  const paidAccounts = new Set(
    (await d.select().from(schema.payouts).where(and(eq(schema.payouts.contract, row.contract), eq(schema.payouts.campaignId, row.campaignId), eq(schema.payouts.status, 'paid')))).map((p) => p.account),
  );
  const creators = [...new Set(subs.filter((s) => paidAccounts.has(s.h160)).map((s) => s.creator))];
  if (creators.length === 0) return;

  const api = await nativeApi();
  const admin = await nativeAdmin();
  const calls = [];
  const minted: { creator: string; item: number }[] = [];
  const adopted: { creator: string; item: number }[] = [];
  const reserved = new Set<number>();

  for (const creator of creators) {
    const [badge] = await d.select().from(schema.badges).where(and(eq(schema.badges.collection, collection), eq(schema.badges.creator, creator)));
    let item = badge?.item;
    if (item === undefined) {
      // The chain is authoritative: reuse the creator's existing badge, otherwise mint at their deterministic id.
      const found = await resolveBadgeItem(api, collection, creator, reserved);
      item = found.item;
      reserved.add(item);
      if (found.exists) adopted.push({ creator, item });
      else {
        calls.push(api.tx.nfts.mint(collection, item, creator, null));
        minted.push({ creator, item });
      }
    }
    // Lifetime stats across every campaign this creator was paid in.
    const mySubs = await d.select().from(schema.submissions).where(and(eq(schema.submissions.contract, row.contract), eq(schema.submissions.creator, creator)));
    const h160s = [...new Set(mySubs.map((s) => s.payoutH160))];
    const myPayouts = (await d.select().from(schema.payouts).where(and(eq(schema.payouts.contract, row.contract), eq(schema.payouts.status, 'paid')))).filter((p) => h160s.includes(p.account));
    const paidCampaigns = new Set(myPayouts.map((p) => p.campaignId));
    const views = mySubs.filter((s) => s.status === 'verified' && paidCampaigns.has(s.campaignId)).reduce((a, s) => a + BigInt(s.views), 0n);
    const camps = await d.select().from(schema.campaigns).where(eq(schema.campaigns.contract, row.contract));
    const bySymbol = new Map<string, bigint>();
    for (const p of myPayouts) {
      const c = camps.find((x) => x.campaignId === p.campaignId);
      if (c) bySymbol.set(`${c.tokenSymbol}:${c.tokenDecimals}`, (bySymbol.get(`${c.tokenSymbol}:${c.tokenDecimals}`) ?? 0n) + BigInt(p.amount));
    }
    const earned = [...bySymbol].map(([k, v]) => `${fmtUnits(v, Number(k.split(':')[1]), 2).replace(/,/g, '')} ${k.split(':')[0]}`).join(' + ');
    calls.push(api.tx.nfts.setAttribute(collection, item, { CollectionOwner: null }, 'stats', badgeStatsValue(paidCampaigns.size, views, earned)));
  }

  const r = await sendNative(api, api.tx.utility.batchAll(calls), admin);
  for (const m of [...minted, ...adopted]) await d.insert(schema.badges).values({ collection, creator: m.creator, item: m.item, mintTx: r.txHash }).onConflictDoNothing();
  for (const creator of creators) await d.update(schema.badges).set({ updatedTx: r.txHash }).where(and(eq(schema.badges.collection, collection), eq(schema.badges.creator, creator)));
  await logActivity(row.campaignId, 'badges', `Creator badges: ${minted.length} minted, ${creators.length} updated (soulbound NFTs)`, r.txHash);
}

/**
 * Badge item id for a creator: the first 4 bytes of blake2-256(public key), probing forward past ids owned by someone
 * else. Deterministic, so anyone can find a creator's badge on-chain without our database, and a fresh database can
 * never collide with badges that already exist.
 */
async function resolveBadgeItem(api: Awaited<ReturnType<typeof nativeApi>>, collection: number, creator: string, reserved: Set<number>) {
  // Already holds a badge in this collection (e.g. minted before a database reset)? Adopt it — one badge per creator.
  const owned = await api.query.nfts.account.keys(creator, collection);
  if (owned.length > 0) return { item: owned[0].args[2].toNumber(), exists: true };
  const seed = blake2AsU8a(decodeAddress(creator), 256);
  let item = new DataView(seed.buffer, seed.byteOffset, 4).getUint32(0) & 0x7fffffff;
  for (let i = 0; i < 32; i++, item = (item + 1) >>> 0) {
    if (reserved.has(item)) continue;
    const existing = await api.query.nfts.item(collection, item);
    if (existing.isNone) return { item, exists: false };
    if (encodeAddress(existing.unwrap().owner, 42) === encodeAddress(decodeAddress(creator), 42)) return { item, exists: true };
  }
  throw new Error(`no free badge id near ${item} for ${creator}`);
}
