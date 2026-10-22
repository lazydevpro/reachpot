// End-to-end run of the whole product against a running web app + chain, exactly as users would drive it:
//   brand funds a campaign (EVM, native asset via precompile) → creators submit Shorts (Portaldot wallets, signed)
//   → views accrue → keeper stores the snapshot in TransactionStorage and posts the root → dispute window
//   → keeper pays every creator + mints soulbound badges → anyone verifies the snapshot from chain
//   → a creator cashes out on the native DEX → brand reclaims any leftover.
// Usage: pnpm e2e [--network local|testnet] [--web http://localhost:3000]
// Testnet: run the web app with NEXT_PUBLIC_NETWORK=testnet VIEWS_SOURCE=mock ENABLE_DEV_TOOLS=1 (scripted Shorts use
// simulated views); demo creators are throwaway keys funded from the native admin (mapping reserves ~3.3 tPOT each).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringToU8a, u8aToHex } from '@polkadot/util';
import { erc20Abi, keccak256, parseEventLogs, toBytes, type Address, type Hex } from 'viem';
import { CampaignStatus, STATUS_LABEL, campaignFromTuple, fmtUnits, reachpotAbi } from '@reachpot/core';
import { assetBalance, assetKind, freeBalance, isMapped, nativeKind, readStoredData, sendNative } from '@reachpot/core/native';
import { snapshotHash, verifySnapshot, type Snapshot } from '@reachpot/allocation';
import { ROOT, arg, demoCreators, evmClients, evmRoles, loadDeployment, nativeAdmin, native, net } from './lib/ctx.js';

const WEB = arg('web') ?? process.env.WEB_URL ?? 'http://localhost:3000';
const KEEPER_SECRET = process.env.KEEPER_SECRET ?? 'local-dev';
const rows: { step: string; detail: string; tx?: string }[] = [];
const ok = (step: string, detail: string, tx?: string) => {
  rows.push({ step, detail, tx });
  console.log(`✅ ${step} — ${detail}${tx ? `\n   ${tx}` : ''}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(`${WEB}${path}`, {
    ...init,
    method: init?.json ? 'POST' : (init?.method ?? 'GET'),
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.json ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${data.error ?? JSON.stringify(data)}`);
  return data as T;
}

const dep = loadDeployment();
const { api: chain, units } = await native();
const roles = evmRoles();
const brand = evmClients(roles.brand);
const token = dep.assets.find((a) => a.symbol === 'rUSD')!;
const U = 10n ** BigInt(token.decimals);
const reachpot = dep.reachpot.address;
console.log(`Reachpot e2e on ${net.label} · web ${WEB} · contract ${reachpot}\n`);

// ----------------------------------------------------------- 1. brand funds
const now = Math.floor(Date.now() / 1000);
const windowSecs = net.name === 'local' ? 45 : 300;
const rules = {
  title: `Launch week Shorts #${now % 10_000}`,
  brief: 'Post a YouTube Short showing your favourite Portaldot moment. Mention @reachpot and keep it under 60 seconds.',
  brandName: 'Nova Labs',
  platform: 'youtube-shorts' as const,
  minViews: '100',
};
const rulesHash = keccak256(
  toBytes(JSON.stringify({ schema: 'reachpot.rules/v1', title: rules.title, brief: rules.brief, brandName: rules.brandName, platform: rules.platform, minViews: rules.minViews })),
);
const pool = 10_000n * U;
const approveTx = await brand.walletClient.writeContract({ address: token.precompile, abi: erc20Abi, functionName: 'approve', args: [reachpot, pool] });
await brand.publicClient.waitForTransactionReceipt({ hash: approveTx });
ok('brand approves rUSD via native-asset precompile', `${fmtUnits(pool, token.decimals)} rUSD → ${token.precompile}`, approveTx);

const { request } = await brand.publicClient.simulateContract({
  account: roles.brand,
  address: reachpot,
  abi: reachpotAbi,
  functionName: 'createCampaign',
  args: [
    {
      token: token.precompile,
      pool,
      start: BigInt(now - 5),
      end: BigInt(now + windowSecs),
      measurementDelay: dep.windows.minMeasurementDelay,
      capPerCreator: 4_000n * U,
      minViews: 100n,
      rulesHash,
    },
  ],
});
const createTx = await brand.walletClient.writeContract(request);
const createRcpt = await brand.publicClient.waitForTransactionReceipt({ hash: createTx });
const created = parseEventLogs({ abi: reachpotAbi, logs: createRcpt.logs, eventName: 'CampaignCreated' })[0];
const id = Number(created.args.id);
ok('brand creates campaign (pool escrowed on-chain)', `#${id}: 10,000 rUSD pool, 4,000 cap/creator, window ${windowSecs}s`, createTx);
await api('/api/campaigns', { json: { campaignId: id, createTx, rules } });
ok('campaign rules registered (hash-bound to rulesHash)', rulesHash);

// ------------------------------------------------------- 2. creators submit
const plannedViews = net.name === 'local' ? [142_000n, 42_500n, 13_100n, 60n] : [42_500n, 13_100n]; // 60 < minViews → excluded
const creators = await demoCreators(plannedViews.length);
if (net.name !== 'local') {
  // Each creator needs native balance for the revive.mapAccount deposit (52 bytes + 1 item) plus fees.
  const admin = await nativeAdmin();
  const need = chain.consts.revive.depositPerItem.toBigInt() + chain.consts.revive.depositPerByte.toBigInt() * 60n + units.existentialDeposit * 5n;
  for (const c of creators) {
    const free = await freeBalance(chain, c.address);
    if (free < need) {
      const r = await sendNative(chain, chain.tx.balances.transferKeepAlive(c.address, need - free), admin);
      ok('fund demo creator (mapping deposit + fees)', `${c.address} ← ${fmtUnits(need - free, units.decimals)} ${dep.native.symbol}`, r.txHash);
    }
  }
}
const videoIds: string[] = [];
for (const [i, c] of creators.entries()) {
  if (!(await isMapped(chain, c.address))) {
    const r = await sendNative(chain, chain.tx.revive.mapAccount(), c);
    ok(`creator ${i + 1} enables payouts (revive.mapAccount)`, c.address, r.txHash);
  }
  const videoId = `rp${(now + i).toString(36)}${'x'.repeat(11)}`.slice(0, 11);
  videoIds.push(videoId);
  const message = ['Reachpot submission', `campaign: ${reachpot.toLowerCase()}#${id}`, `video: ${videoId}`, `creator: ${c.address}`].join('\n');
  const signature = u8aToHex(c.sign(stringToU8a(message)));
  const sub = await api<{ status: string; payoutH160: string }>('/api/submissions', {
    json: { campaignId: id, videoUrl: `https://youtube.com/shorts/${videoId}`, creator: c.address, signature },
  });
  await api('/api/dev/views', { json: { campaignId: id, videoId, views: plannedViews[i].toString() }, headers: { 'x-keeper-secret': KEEPER_SECRET } });
  ok(`creator ${i + 1} submits a Short (signed)`, `${videoId} · ${sub.status} · payout H160 ${sub.payoutH160} · ${plannedViews[i].toLocaleString()} views`);
}

// --------------------------------------------- 3. keeper: snapshot → root → payouts
type Detail = { status: number; root: string | null; snapshot: { hash: Hex; block: number; index: number; storeTx: string; rootTx: string } | null; payouts: { account: string; amount: string; status: string; txHash: string }[]; activity: { kind: string; message: string; tx: string | null }[] };
const tick = () => api('/api/keeper/tick', { method: 'POST', headers: { 'x-keeper-secret': KEEPER_SECRET } }).catch(() => null);
let detail: Detail;
let lastStatus = -1;
const deadline = Date.now() + (windowSecs + dep.windows.minMeasurementDelay + dep.windows.disputeWindow + 180) * 1000;
for (;;) {
  await tick();
  detail = await api<Detail>(`/api/campaigns/${id}`);
  if (detail.status !== lastStatus) {
    console.log(`   … status: ${STATUS_LABEL[detail.status as CampaignStatus]}`);
    lastStatus = detail.status;
  }
  if (detail.payouts.length > 0 && detail.activity.some((a) => a.kind === 'badges')) break;
  if (Date.now() > deadline) throw new Error(`timed out; last status ${STATUS_LABEL[detail.status as CampaignStatus]}`);
  await sleep(3000);
}
const snap = detail.snapshot!;
ok('keeper stores snapshot in TransactionStorage', `block #${snap.block}, extrinsic ${snap.index}, blake2-256 ${snap.hash}`, snap.storeTx);
ok('oracle posts payout root (Reachpot.postRoot)', `${detail.root}`, snap.rootTx);
for (const p of detail.payouts) ok(`payout ${p.status}`, `${p.account} ← ${fmtUnits(BigInt(p.amount), token.decimals)} rUSD`, p.txHash);
const badgeAct = detail.activity.find((a) => a.kind === 'badges')!;
ok('soulbound creator badges minted/updated (Nfts)', badgeAct.message, badgeAct.tx ?? undefined);

// ------------------------------------------------- 4. independent verification
const bytes = await readStoredData(chain, snap.block, snap.index);
const onchain = campaignFromTuple(await brand.publicClient.readContract({ address: reachpot, abi: reachpotAbi, functionName: 'campaigns', args: [BigInt(id)] }));
const s = JSON.parse(new TextDecoder().decode(bytes)) as Snapshot;
const v = verifySnapshot(s, { root: onchain.root, totalAllocated: onchain.totalAllocated, hash: onchain.snapshotHash, bytes });
if (!v.ok) throw new Error(`verification failed: ${v.problems.join('; ')}`);
ok('anyone verifies: chain data → blake2 hash → recomputed root', `hash ${snapshotHash(bytes)} = on-chain; root ${v.recomputedRoot} = on-chain`);

// ------------------------------------------------------ 5. creator cashes out
const bob = creators[0];
const bobRusd = await assetBalance(chain, token.id, bob.address);
const amountIn = bobRusd / 2n;
const quote = await chain.call.assetConversionApi.quotePriceExactTokensForTokens(assetKind(token.id), nativeKind, amountIn, true);
const minOut = ((quote as unknown as { unwrapOr: (x: bigint) => { toBigInt?: () => bigint } }).unwrapOr(0n) as { toBigInt?: () => bigint }).toBigInt?.() ?? 0n;
const before = await freeBalance(chain, bob.address);
const swap = await sendNative(chain, chain.tx.assetConversion.swapExactTokensForTokens([assetKind(token.id), nativeKind], amountIn, (minOut * 95n) / 100n, bob.address, true), bob);
const gained = (await freeBalance(chain, bob.address)) - before;
ok('creator cashes out on the native DEX (AssetConversion)', `${fmtUnits(amountIn, token.decimals)} rUSD → ~${fmtUnits(gained, units.decimals)} ${dep.native.symbol}`, swap.txHash);

// ------------------------------------------------------------ 6. brand refund
const refundable = await brand.publicClient.readContract({ address: reachpot, abi: reachpotAbi, functionName: 'refundable', args: [BigInt(id)] });
if (refundable > 0n) {
  const r = await brand.walletClient.writeContract({ address: reachpot, abi: reachpotAbi, functionName: 'refund', args: [BigInt(id)] });
  await brand.publicClient.waitForTransactionReceipt({ hash: r });
  ok('brand reclaims unallocated remainder', `${fmtUnits(refundable, token.decimals)} rUSD`, r);
} else ok('brand refund', 'nothing left over: the whole pot went to creators');

// --------------------------------------------------------------- 7. report
const md = [
  `# Reachpot end-to-end run (${net.label})`,
  '',
  `Run ${new Date().toISOString()} · contract \`${reachpot}\` · campaign #${id} · web ${WEB}`,
  '',
  '| Step | Detail | Tx |',
  '|---|---|---|',
  ...rows.map((r) => `| ${r.step} | ${r.detail.replace(/\|/g, '\\|')} | ${r.tx ? `\`${r.tx}\`` : ''} |`),
  '',
].join('\n');
mkdirSync(resolve(ROOT, 'docs'), { recursive: true });
writeFileSync(resolve(ROOT, `docs/e2e-${net.name}.md`), md);
console.log(`\n🎉 end-to-end OK → docs/e2e-${net.name}.md`);
await chain.disconnect();
void (roles satisfies Record<string, { address: Address }>);
