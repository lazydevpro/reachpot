// Deploys Reachpot + demo assets + DEX pools + badge collection, writes deployments/<network>.json.
//   pnpm deploy:local      (local kitchensink chain, dev accounts)
//   pnpm deploy:testnet    (Portaldot V3 testnet, keys from .env)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Address, Hex } from 'viem';
import { assetPrecompileAddress, fmtUnits, reachpotAbi, reachpotBytecode, type Deployment } from '@reachpot/core';
import { accountOfH160, assetKind, freeBalance, nativeKind, sendNative } from '@reachpot/core/native';
import { deploymentPath, evmClients, evmRoles, nativeAdmin, native, net } from './lib/ctx.js';

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

// 1. Native gas for the EVM roles (Revive charges the mapped native account).
const budget = net.name === 'local'
  ? { deployer: 1_000n * one, oracle: 1_000n * one, guardian: 100n * one, brand: 1_000n * one }
  : { deployer: 4n * one, oracle: 3n * one, guardian: 1n * one, brand: 3n * one };
const funded = new Set<string>();
for (const [role, acct] of Object.entries(roles) as [keyof typeof budget, (typeof roles)[keyof typeof roles]][]) {
  const nativeAcct = await accountOfH160(api, acct.address);
  if (funded.has(nativeAcct)) continue;
  funded.add(nativeAcct);
  const have = await freeBalance(api, nativeAcct);
  if (have < budget[role] / 2n) {
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
  args: [
    roles.deployer.address,
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
  { symbol: 'rUSD', name: 'Reachpot USD (test)', decimals: 6, preferred: 7770, brandMint: 1_000_000n, liquidity: [100_000n, net.name === 'local' ? 660_000n : 5n] as const },
  { symbol: 'NOVA', name: 'Nova (demo project token)', decimals: 12, preferred: 7771, brandMint: 5_000_000n, liquidity: [500_000n, net.name === 'local' ? 50_000n : 2n] as const },
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
      api.tx.assetConversion.addLiquidity(nativeKind, assetKind(id), a.liquidity[1] * one, a.liquidity[0] * u, 1, 1, admin.address),
      admin,
    );
    pool = { lpToken, tx: add.txHash };
    txs[`pool ${a.symbol}/${net.symbol}`] = add.txHash;
    step(`DEX pool ${a.symbol}/${net.symbol}`, `${a.liquidity[0].toLocaleString()} ${a.symbol} : ${a.liquidity[1].toLocaleString()} ${net.symbol}`);
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
  api.tx.nfts.setCollectionMetadata(collection, JSON.stringify({ name: 'Reachpot Creator Badges', description: 'Soulbound record of campaigns, views and earnings on Reachpot.' })),
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
