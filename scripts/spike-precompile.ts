// Phase 0 spike: prove (or disprove) the write path of the native-asset ERC-20 precompile from Revive contracts,
// and find out what a fresh creator wallet (no native balance) needs to receive a native asset.
// Re-runnable: created asset / deployed probe are cached in scripts/out/spike-state.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { erc20Abi, parseEventLogs, type Address, type Hash } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  EVM_POT,
  NATIVE_DECIMALS,
  POT,
  ROOT,
  assetPrecompileAddress,
  evmClients,
  fmt,
  freeBalance,
  loadArtifact,
  mappedAccount,
  nativeAdmin,
  nativeApi,
  sendNative,
} from './lib/portaldot.js';

const OUT = resolve(ROOT, 'scripts/out');
const STATE = resolve(OUT, 'spike-state.json');
mkdirSync(OUT, { recursive: true });
const state: { assetId?: number; probe?: Address } = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 2));

const log: { step: string; ok: boolean; detail: string; tx?: string }[] = [];
const record = (step: string, ok: boolean, detail: string, tx?: string) => {
  log.push({ step, ok, detail, tx });
  console.log(`${ok ? '✅' : '❌'} ${step} — ${detail}${tx ? `\n   tx ${tx}` : ''}`);
};

const DEC = 6;
const UNIT = 10n ** BigInt(DEC);

const api = await nativeApi();
const admin = nativeAdmin();
const { account, publicClient, walletClient } = evmClients();
const deployerNative = await mappedAccount(api, account.address);

// 1. Gas for the EVM deployer (funded from the native admin).
const adminFree = await freeBalance(api, admin.address);
console.log(`native admin ${admin.address}: ${fmt(adminFree, NATIVE_DECIMALS)} tPOT`);
if (adminFree < 8n * POT) throw new Error('fund the native admin with at least 8 tPOT first (see TODO.md)');
if ((await freeBalance(api, deployerNative)) < 3n * POT) {
  const r = await sendNative(api, api.tx.balances.transferKeepAlive(deployerNative, 5n * POT), admin);
  record('fund EVM deployer', true, `5 tPOT → ${deployerNative}`, r.txHash);
}

// 2. Native asset "rUSD" (6 decimals) owned by the native admin, minted to the EVM deployer's mapped account.
if (state.assetId === undefined) {
  let id = 0;
  do id = 700_000 + Math.floor(Math.random() * 99_999);
  while ((await api.query.assets.asset(id)).isSome);
  const r = await sendNative(
    api,
    api.tx.utility.batchAll([
      api.tx.assets.create(id, admin.address, 1),
      api.tx.assets.setMetadata(id, 'Reachpot USD (test)', 'rUSD', DEC),
      api.tx.assets.mint(id, deployerNative, 1_000_000n * UNIT),
    ]),
    admin,
  );
  state.assetId = id;
  save();
  record('create native asset', true, `asset ${id} rUSD, 1,000,000 minted to deployer`, r.txHash);
}
const token = assetPrecompileAddress(state.assetId!);
const bal = (who: Address) => publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [who] });
console.log(`rUSD asset ${state.assetId} precompile ${token}; deployer balance ${fmt(await bal(account.address), DEC)}`);

// 3. Deploy the probe.
const probeArt = loadArtifact('PrecompileProbe.sol', 'PrecompileProbe');
if (!state.probe) {
  const hash = await walletClient.deployContract({ abi: probeArt.abi, bytecode: probeArt.bytecode });
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  if (rcpt.status !== 'success' || !rcpt.contractAddress) throw new Error(`probe deploy failed ${hash}`);
  state.probe = rcpt.contractAddress;
  save();
  record('deploy PrecompileProbe', true, rcpt.contractAddress, hash);
}
const probe = state.probe!;

async function send(step: string, req: Parameters<typeof walletClient.writeContract>[0]): Promise<{ ok: boolean; hash?: Hash; logs?: any[] }> {
  try {
    const { request } = await publicClient.simulateContract({ ...req, account } as any);
    const hash = await walletClient.writeContract(request as any);
    const rcpt = await publicClient.waitForTransactionReceipt({ hash });
    const ok = rcpt.status === 'success';
    if (!ok) record(step, false, 'receipt status reverted', hash);
    return { ok, hash, logs: rcpt.logs };
  } catch (e) {
    record(step, false, (e as Error).message.split('\n').slice(0, 3).join(' | '));
    return { ok: false };
  }
}

// 4. EOA approve through the precompile.
const amount = 100n * UNIT;
const a = await send('approve via precompile', { address: token, abi: erc20Abi, functionName: 'approve', args: [probe, amount] } as any);
if (a.ok) {
  const allowance = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [account.address, probe] });
  record('approve via precompile', allowance === amount, `allowance=${fmt(allowance, DEC)}`, a.hash);
}

// 5. Contract transferFrom through the precompile.
const p = await send('contract transferFrom (pull)', { address: probe, abi: probeArt.abi, functionName: 'pull', args: [token, account.address, amount] } as any);
if (p.ok) record('contract transferFrom (pull)', true, `probe holds ${fmt(await bal(probe), DEC)} rUSD`, p.hash);

// 6. Contract transfer to recipients in different states.
async function pushTo(label: string, to: Address) {
  const before = await bal(to);
  const r = await send(`push → ${label}`, { address: probe, abi: probeArt.abi, functionName: 'push', args: [token, to, 10n * UNIT] } as any);
  if (!r.ok) return false;
  const ev = parseEventLogs({ abi: probeArt.abi, logs: r.logs!, eventName: 'Pushed' })[0] as any;
  const got = (await bal(to)) - before;
  const ok = Boolean(ev?.args?.ok) && got === 10n * UNIT;
  record(`push → ${label}`, ok, `inner ok=${ev?.args?.ok} received=${fmt(got, DEC)} ret=${ev?.args?.ret}`, r.hash);
  return ok;
}

const fresh = () => privateKeyToAccount(generatePrivateKey()).address;

// 6a. Fresh H160: no native balance, no asset account.
const f1 = fresh();
await pushTo('fresh H160, no native balance', f1);

// 6b. Fresh H160 that first receives the existential deposit (0.1 tPOT) from the EVM side.
const f2 = fresh();
try {
  const hash = await walletClient.sendTransaction({ to: f2, value: EVM_POT / 10n });
  await publicClient.waitForTransactionReceipt({ hash });
  record('send ED (0.1 tPOT) to fresh H160 via EVM', true, f2, hash);
} catch (e) {
  record('send ED (0.1 tPOT) to fresh H160 via EVM', false, (e as Error).message.split('\n')[0]);
}
await pushTo('fresh H160 with ED', f2);

// 6c. Fresh H160 "touched" by the asset admin (admin pays the asset-account deposit).
const f3 = fresh();
try {
  const r = await sendNative(api, api.tx.assets.touchOther(state.assetId!, await mappedAccount(api, f3)), admin);
  record('assets.touchOther fresh H160', true, f3, r.txHash);
} catch (e) {
  record('assets.touchOther fresh H160', false, (e as Error).message);
}
await pushTo('fresh H160 touched by admin', f3);

// 7. Persist evidence.
const md = [
  `# Spike: native-asset ERC-20 precompile write path`,
  ``,
  `Run ${new Date().toISOString()} on Portaldot V3 testnet (chainId 420420777).`,
  ``,
  `- rUSD native asset id: \`${state.assetId}\` → precompile \`${token}\``,
  `- PrecompileProbe: \`${probe}\``,
  `- EVM deployer: \`${account.address}\` (native \`${deployerNative}\`)`,
  ``,
  `| Step | Result | Detail | Tx |`,
  `|---|---|---|---|`,
  ...log.map((l) => `| ${l.step} | ${l.ok ? '✅' : '❌'} | ${l.detail.replace(/\|/g, '\\|')} | ${l.tx ? `\`${l.tx}\`` : ''} |`),
  ``,
].join('\n');
mkdirSync(resolve(ROOT, 'docs'), { recursive: true });
writeFileSync(resolve(ROOT, 'docs/spike-precompile.md'), md);
console.log('\nwrote docs/spike-precompile.md');
await api.disconnect();
