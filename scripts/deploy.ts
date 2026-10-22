// Deploys Reachpot + demo assets + DEX pools + badge collection, writes deployments/<network>.json.
//   pnpm deploy:local      (local kitchensink chain, dev accounts)
//   pnpm deploy:testnet    (Portaldot V3 testnet, keys from .env)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Address, Hex } from 'viem';
import { assetPrecompileAddress, fmtUnits, reachpotAbi, reachpotBytecode, type Deployment } from '@reachpot/core';
import { accountOfH160, assetKind, freeBalance, nativeKind, sendNative } from '@reachpot/core/native';
import { ROOT, deploymentPath, evmClients, evmRoles, nativeAdmin, native, net } from './lib/ctx.js';

const WINDOWS =
  net.name === 'local'
    ? { disputeWindow: 60, minMeasurementDelay: 20, rootTimeout: 2 * 86_400, claimWindow: 30 * 86_400 }
    : { disputeWindow: 600, minMeasurementDelay: 120, rootTimeout: 7 * 86_400, claimWindow: 30 * 86_400 };

const { api, units } = await native();
const admin = await nativeAdmin();
const roles = evmRoles();
const one = 10n ** BigInt(units.decimals);
const txs: Record<string, string> = {};
const step = (name: string, detail = '') => console.log(`• ${name}${detail ? ` — ${detail}` : ''}`);

console.log(`Deploying Reachpot to ${net.label} (${net.ws})`);
console.log(`native admin ${admin.address}: ${fmtUnits(await freeBalance(api, admin.address), units.decimals)} ${net.symbol}`);

// Revive charges a storage deposit for contract code: depositPerByte × initcode size, plus a code-hash lockup
// (codeHashLockupDepositPercent, 30% on Portaldot) — ~0.078 tPOT per initcode byte on testnet — plus constructor storage.
const initBytes = (JSON.parse(readFileSync(resolve(ROOT, 'contracts/out/Reachpot.sol/Reachpot.json'), 'utf8')).bytecode.object.length - 2) / 2;
const perByte = api.consts.revive.depositPerByte.toBigInt();
const perItem = api.consts.revive.depositPerItem.toBigInt();
const lockupPerbill = BigInt(api.consts.revive.codeHashLockupDepositPercent.toString());
const codeDeposit = (BigInt(initBytes) * perByte * (1_000_000_000n + lockupPerbill)) / 1_000_000_000n;
const deployBudget = (codeDeposit * 102n) / 100n + 5n * perItem + 2n * one; // + fee-cap headroom, account storage, gas
console.log(`Reachpot initcode ${initBytes} B → code deposit + lockup ≈ ${fmtUnits(codeDeposit, units.decimals, 1)} ${net.symbol}; deployer budget ${fmtUnits(deployBudget, units.decimals, 1)}`);

// 1. Native gas + deposits for the EVM roles (Revive charges the mapped native account). On testnet one key holds
// every EVM role, so only the deployer budget applies there.
const budget = net.name === 'local'
  ? { deployer: 1_000_000n * one, oracle: 1_000_000n * one, guardian: 100_000n * one, brand: 1_000_000n * one } // revive reserves large gas up front locally
  : { deployer: deployBudget, oracle: 3n * one, guardian: 1n * one, brand: 3n * one };
const adminFree = await freeBalance(api, admin.address);
const setupReserve = net.name === 'local' ? 0n : 15n * one; // assets, pools + liquidity, badge collection
const deployerHas = await freeBalance(api, await accountOfH160(api, roles.deployer.address));
const topUp = deployBudget > deployerHas ? deployBudget - deployerHas : 0n;
if (net.name !== 'local' && adminFree < topUp + setupReserve) {
  throw new Error(`native admin needs ≥ ${fmtUnits(topUp + setupReserve, units.decimals, 1)} ${net.symbol} (has ${fmtUnits(adminFree, units.decimals, 1)})`);
}
const funded = new Set<string>();
for (const [role, acct] of Object.entries(roles) as [keyof typeof budget, (typeof roles)[keyof typeof roles]][]) {
  const nativeAcct = await accountOfH160(api, acct.address);
  if (funded.has(nativeAcct)) continue;
  funded.add(nativeAcct);
  const have = await freeBalance(api, nativeAcct);
  if (have < (net.name === 'local' ? budget[role] / 2n : budget[role])) {
    const r = await sendNative(api, api.tx.balances.transferKeepAlive(nativeAcct, budget[role] - have), admin);
    txs[`fund ${role}`] = r.txHash;
    step(`funded ${role}`, `${acct.address} → ${nativeAcct}`);
  }
}

// 2. Reachpot contract.
const { publicClient, walletClient } = evmClients(roles.deployer);
const deployTx = await walletClient.deployContract({
  abi: reachpotAbi,
  bytecode: reachpotBytecode as Hex,
  // Revive's gas covers the storage deposit; cap the fee at the current gas price so the up-front reservation
  // (gas × maxFeePerGas) is not inflated by the default 20% buffer.
  ...(net.name === 'local' ? {} : { maxFeePerGas: ((await publicClient.getGasPrice()) * 101n) / 100n, maxPriorityFeePerGas: 0n }),
  args: [
    roles.oracle.address,
    roles.guardian.address,
    BigInt(WINDOWS.disputeWindow),
    WINDOWS.minMeasurementDelay,
    BigInt(WINDOWS.rootTimeout),
    BigInt(WINDOWS.claimWindow),
  ],
});
const rcpt = await publicClient.waitForTransactionReceipt({ hash: deployTx });
if (rcpt.status !== 'success' || !rcpt.contractAddress) throw new Error(`Reachpot deploy failed: ${deployTx}`);
step('Reachpot deployed', `${rcpt.contractAddress} (tx ${deployTx})`);

// 3. Demo assets owned by the native admin.
async function freeAssetId(preferred: number): Promise<number> {
  let id = preferred;
  while ((await api.query.assets.asset(id)).isSome) id = preferred + 1 + Math.floor(Math.random() * 10_000);
  return id;
}
const brandNative = await accountOfH160(api, roles.brand.address);
const demoAssets = [
  // liquidity = [asset units, native planck]; testnet pools are small because every tPOT matters there.
  { symbol: 'rUSD', name: 'Reachpot USD (test)', decimals: 6, preferred: 7770, brandMint: 1_000_000n, liquidity: [100_000n, net.name === 'local' ? 660_000n * one : 2n * one] as const },
  { symbol: 'NOVA', name: 'Nova (demo token)', decimals: 12, preferred: 7771, brandMint: 5_000_000n, liquidity: [500_000n, net.name === 'local' ? 50_000n * one : one] as const },
];
const assets: Deployment['assets'] = [];
for (const a of demoAssets) {
  const id = await freeAssetId(a.preferred);
  const u = 10n ** BigInt(a.decimals);
  const r = await sendNative(
    api,
    api.tx.utility.batchAll([
      api.tx.assets.create(id, admin.address, 1),
      api.tx.assets.setMetadata(id, a.name, a.symbol, a.decimals),
      api.tx.assets.mint(id, brandNative, a.brandMint * u),
      api.tx.assets.mint(id, admin.address, (a.liquidity[0] + 1_000n) * u), // keep a remainder: Preserve transfers can't empty the account
    ]),
    admin,
  );
  txs[`create ${a.symbol}`] = r.txHash;
  step(`asset ${a.symbol} created`, `id ${id}, precompile ${assetPrecompileAddress(id)}, ${a.brandMint.toLocaleString()} minted to brand`);

  // 4. Native DEX pool asset/native with liquidity from the admin.
  let pool: { lpToken: number; tx: string } | undefined;
  try {
    const create = await sendNative(api, api.tx.assetConversion.createPool(nativeKind, assetKind(id)), admin);
    const ev = create.events.find((e) => e.section === 'assetConversion' && e.method === 'PoolCreated');
    const lpToken = Number(String((ev?.data as { lpToken?: string })?.lpToken ?? '0').replace(/,/g, ''));
    const add = await sendNative(
      api,
      api.tx.assetConversion.addLiquidity(nativeKind, assetKind(id), a.liquidity[1], a.liquidity[0] * u, 1, 1, admin.address),
      admin,
    );
    pool = { lpToken, tx: add.txHash };
    txs[`pool ${a.symbol}/${net.symbol}`] = add.txHash;
    step(`DEX pool ${a.symbol}/${net.symbol}`, `${a.liquidity[0].toLocaleString()} ${a.symbol} : ${fmtUnits(a.liquidity[1], units.decimals)} ${net.symbol}`);
  } catch (e) {
    step(`DEX pool ${a.symbol}/${net.symbol} skipped`, (e as Error).message);
  }
  assets.push({ id, symbol: a.symbol, name: a.name, decimals: a.decimals, precompile: assetPrecompileAddress(id), pool });
}

// 5. Creator badge collection. pallet-nfts settings are *disabled* flags: setting TransferableItems (1) makes every
// badge soulbound, while metadata and attributes stay editable so the keeper can update stats after each payout.
const COLLECTION_DISABLE_TRANSFERS = 1;
const ITEM_DISABLE_TRANSFER = 1;
const created = await sendNative(
  api,
  api.tx.nfts.create(admin.address, {
    settings: COLLECTION_DISABLE_TRANSFERS,
    maxSupply: null,
    mintSettings: { mintType: { Issuer: null }, price: null, startBlock: null, endBlock: null, defaultItemSettings: ITEM_DISABLE_TRANSFER },
  }),
  admin,
);
const createdEv = created.events.find((e) => e.section === 'nfts' && e.method === 'Created');
const collection = Number(String((createdEv?.data as { collection?: string })?.collection ?? '0').replace(/,/g, ''));
const meta = await sendNative(
  api,
  // Metadata deposits are per byte (0.06 tPOT on testnet), so keep it short.
  api.tx.nfts.setCollectionMetadata(collection, 'Reachpot Creator Badges'),
  admin,
);
txs['badge collection'] = created.txHash;
txs['badge collection metadata'] = meta.txHash;
step('badge collection created', `nfts collection ${collection}`);

const deployment: Deployment = {
  network: net.name,
  chainId: net.chainId,
  deployedAt: new Date().toISOString(),
  reachpot: { address: rcpt.contractAddress as Address, deployTx, blockNumber: Number(rcpt.blockNumber) },
  roles: { owner: roles.deployer.address, oracle: roles.oracle.address, guardian: roles.guardian.address, nativeAdmin: admin.address },
  windows: WINDOWS,
  native: { decimals: units.decimals, symbol: net.symbol, nativeToEthRatio: units.nativeToEthRatio.toString() },
  assets,
  badges: { collection, tx: created.txHash },
  txs,
};
mkdirSync(dirname(deploymentPath()), { recursive: true });
writeFileSync(deploymentPath(), `${JSON.stringify(deployment, null, 2)}\n`);
console.log(`\n✅ wrote ${deploymentPath().replace(`${process.cwd()}/`, '')}`);
await api.disconnect();
