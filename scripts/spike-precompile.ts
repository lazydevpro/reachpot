// Spike: prove the write path of the native-asset ERC-20 precompile from Revive contracts, and find out what a
// recipient needs to receive a native asset. `pnpm spike [--network local|testnet]` → docs/spike-precompile-<network>.md
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { erc20Abi, parseEventLogs, type Abi, type Address, type Hash, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { assetPrecompileAddress, fmtUnits } from '@reachpot/core';
import { accountOfH160, freeBalance, h160OfAccount, isMapped, sendNative } from '@reachpot/core/native';
import { ROOT, evmClients, evmRoles, localCreators, nativeAdmin, native, net, short } from './lib/ctx.js';

const DEC = 6;
const UNIT = 10n ** BigInt(DEC);
const log: { step: string; ok: boolean; detail: string; tx?: string }[] = [];
const record = (step: string, ok: boolean, detail: string, tx?: string) => {
  log.push({ step, ok, detail, tx });
  console.log(`${ok ? '✅' : '❌'} ${step} — ${detail}${tx ? `\n   tx ${tx}` : ''}`);
};

const art = JSON.parse(readFileSync(resolve(ROOT, 'contracts/out/PrecompileProbe.sol/PrecompileProbe.json'), 'utf8'));
const probeAbi = art.abi as Abi;

const { api, units } = await native();
const admin = await nativeAdmin();
const { deployer, brand } = evmRoles();
const d = evmClients(deployer);
const b = evmClients(brand);
const brandNative = await accountOfH160(api, brand.address);
console.log(`network ${net.name}; native decimals ${units.decimals}; admin ${admin.address}; brand ${brand.address} (${brandNative})`);

// 0. A native-asset holder account must exist (hold >= ED) or minting fails with Token.CannotCreate.
if ((await freeBalance(api, brandNative)) < units.existentialDeposit * 10n) {
  const r = await sendNative(api, api.tx.balances.transferKeepAlive(brandNative, units.existentialDeposit * 20n), admin);
  record('fund brand native account (20× ED)', true, brandNative, r.txHash);
}

// 1. Native asset rUSD owned by the admin, minted to the brand's account.
let id = 0;
do id = 700_000 + Math.floor(Math.random() * 99_999);
while ((await api.query.assets.asset(id)).isSome);
{
  const r = await sendNative(
    api,
    api.tx.utility.batchAll([
      api.tx.assets.create(id, admin.address, 1),
      api.tx.assets.setMetadata(id, 'Reachpot USD (spike)', 'rUSD', DEC),
      api.tx.assets.mint(id, brandNative, 1_000_000n * UNIT),
    ]),
    admin,
  );
  record('create native asset + mint to brand', true, `asset ${id}`, r.txHash);
}
const token = assetPrecompileAddress(id);
const bal = (who: Address) => d.publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [who] });
record('precompile balanceOf(brand)', (await bal(brand.address)) === 1_000_000n * UNIT, `${fmtUnits(await bal(brand.address), DEC)} rUSD at ${token}`);

// 2. Deploy probe.
const deployHash = await d.walletClient.deployContract({ abi: probeAbi, bytecode: art.bytecode.object as Hex });
const deployRcpt = await d.publicClient.waitForTransactionReceipt({ hash: deployHash });
const probe = deployRcpt.contractAddress!;
record('deploy PrecompileProbe', deployRcpt.status === 'success', probe, deployHash);

async function write(step: string, client: ReturnType<typeof evmClients>, req: Record<string, unknown>) {
  try {
    const { request } = await client.publicClient.simulateContract({ ...req, account: client.walletClient.account } as never);
    const hash: Hash = await client.walletClient.writeContract(request as never);
    const rcpt = await client.publicClient.waitForTransactionReceipt({ hash });
    if (rcpt.status !== 'success') record(step, false, 'reverted', hash);
    return { ok: rcpt.status === 'success', hash, logs: rcpt.logs };
  } catch (e) {
    record(step, false, short(e));
    return { ok: false as const };
  }
}

// 3. EOA approve through the precompile; 4. contract transferFrom.
const amount = 100n * UNIT;
const ap = await write('approve via precompile', b, { address: token, abi: erc20Abi, functionName: 'approve', args: [probe, amount] });
if (ap.ok) {
  const allowance = await b.publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [brand.address, probe] });
  record('approve via precompile', allowance === amount, `allowance ${fmtUnits(allowance, DEC)}`, ap.hash);
}
const pl = await write('contract transferFrom (pull)', d, { address: probe, abi: probeAbi, functionName: 'pull', args: [token, brand.address, amount] });
if (pl.ok) record('contract transferFrom (pull)', (await bal(probe)) === amount, `probe holds ${fmtUnits(await bal(probe), DEC)} rUSD`, pl.hash);

// 5. Contract transfer to recipients in different states.
async function pushTo(label: string, to: Address) {
  const before = await bal(to);
  const r = await write(`push → ${label}`, d, { address: probe, abi: probeAbi, functionName: 'push', args: [token, to, 10n * UNIT] });
  if (!r.ok) return;
  const ev = parseEventLogs({ abi: probeAbi, logs: r.logs!, eventName: 'Pushed' })[0] as unknown as { args: { ok: boolean; ret: Hex } };
  const got = (await bal(to)) - before;
  record(`push → ${label}`, ev.args.ok && got === 10n * UNIT, `inner ok=${ev.args.ok} received=${fmtUnits(got, DEC)}${ev.args.ok ? '' : ` ret=${ev.args.ret.slice(0, 74)}`}`, r.hash);
}
const fresh = () => privateKeyToAccount(generatePrivateKey()).address;

await pushTo('fresh H160, no native balance', fresh());

const withEd = fresh();
try {
  const hash = await d.walletClient.sendTransaction({ to: withEd, value: units.existentialDeposit * units.nativeToEthRatio });
  await d.publicClient.waitForTransactionReceipt({ hash });
  record('send ED to fresh H160 via EVM', true, withEd, hash);
} catch (e) {
  record('send ED to fresh H160 via EVM', false, short(e));
}
await pushTo('fresh H160 with ED', withEd);

const touched = fresh();
try {
  const r = await sendNative(api, api.tx.assets.touchOther(id, await accountOfH160(api, touched)), admin);
  record('assets.touchOther fresh H160 (admin pays deposit)', true, touched, r.txHash);
} catch (e) {
  record('assets.touchOther fresh H160 (admin pays deposit)', false, short(e));
}
await pushTo('fresh H160 touched by admin', touched);

// 6. The real Reachpot path: a native creator account mapped into Revive.
if (net.name === 'local') {
  const [bob] = await localCreators();
  if (!(await isMapped(api, bob.address))) {
    const r = await sendNative(api, api.tx.revive.mapAccount(), bob);
    record('creator revive.mapAccount', true, bob.address, r.txHash);
  }
  const bobH160 = await h160OfAccount(api, bob.address);
  const nativeBefore = (await api.query.assets.account(id, bob.address)).isSome;
  await pushTo(`mapped native creator ${bob.address.slice(0, 8)}… (H160 ${bobH160.slice(0, 10)}…)`, bobH160);
  const acct = await api.query.assets.account(id, bob.address);
  record('payout landed in creator native account', acct.isSome, `native assets.account(${id}, Bob) = ${acct.isSome ? acct.unwrap().balance.toString() : 'none'} (existed before: ${nativeBefore}); native free ${await freeBalance(api, bob.address)}`);
}

const md = [
  `# Spike: native-asset ERC-20 precompile write path (${net.label})`,
  '',
  `Run ${new Date().toISOString()} · chain id ${net.chainId} · native decimals ${units.decimals}`,
  '',
  `- rUSD native asset \`${id}\` → precompile \`${token}\``,
  `- PrecompileProbe \`${probe}\``,
  '',
  '| Step | Result | Detail | Tx |',
  '|---|---|---|---|',
  ...log.map((l) => `| ${l.step} | ${l.ok ? '✅' : '❌'} | ${l.detail.replace(/\|/g, '\\|')} | ${l.tx ? `\`${l.tx}\`` : ''} |`),
  '',
].join('\n');
mkdirSync(resolve(ROOT, 'docs'), { recursive: true });
writeFileSync(resolve(ROOT, `docs/spike-precompile-${net.name}.md`), md);
console.log(`\nwrote docs/spike-precompile-${net.name}.md`);
await api.disconnect();
