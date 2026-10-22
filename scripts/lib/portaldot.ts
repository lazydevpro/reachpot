import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import '@polkadot/api-augment';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import type { ISubmittableResult } from '@polkadot/types/types';
import { cryptoWaitReady, encodeAddress } from '@polkadot/util-crypto';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Abi,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '../..');
loadEnv({ path: resolve(ROOT, '.env'), quiet: true });

export const SUBSTRATE_WS = process.env.PORTALDOT_WS ?? 'wss://test-node-v3.portaldot.dev';
export const EVM_RPC = process.env.PORTALDOT_EVM_RPC ?? 'https://test-evm-rpc-v3.portaldot.dev';
export const EXPLORER = 'https://node-console.portaldot.dev';

/** Native POT has 14 decimals; Revive exposes it to the EVM with 18 (NativeToEthRatio = 10_000). */
export const NATIVE_DECIMALS = 14;
export const POT = 10n ** BigInt(NATIVE_DECIMALS);
export const EVM_POT = 10n ** 18n;

export const portaldotTestnet = defineChain({
  id: 420420777,
  name: 'Portaldot V3 Testnet',
  nativeCurrency: { name: 'tPOT', symbol: 'tPOT', decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
});

/** ERC-20 precompile instances configured in the runtime (`InlineIdConfig<0x1>` / `<0x2>`). */
export const PRECOMPILE_PREFIX = { assets: 0x0001, poolAssets: 0x0002 } as const;

/** Address layout: [4-byte asset id][12 zero bytes][2-byte prefix][2 zero bytes]. */
export function assetPrecompileAddress(assetId: number, prefix: number = PRECOMPILE_PREFIX.assets): Address {
  if (!Number.isInteger(assetId) || assetId < 0 || assetId > 0xffffffff) throw new Error(`bad asset id ${assetId}`);
  const id = assetId.toString(16).padStart(8, '0');
  const pfx = prefix.toString(16).padStart(4, '0');
  return `0x${id}${'0'.repeat(24)}${pfx}0000` as Address;
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing ${name} in .env`);
  return v;
}

// ---------- EVM side ----------

export function evmClients() {
  const account = privateKeyToAccount(requireEnv('DEPLOYER_PRIVATE_KEY') as Hex);
  const transport = http(EVM_RPC, { timeout: 60_000 });
  return {
    account,
    publicClient: createPublicClient({ chain: portaldotTestnet, transport }),
    walletClient: createWalletClient({ account, chain: portaldotTestnet, transport }),
  };
}

export function loadArtifact(file: string, contract: string): { abi: Abi; bytecode: Hex } {
  const json = JSON.parse(readFileSync(resolve(ROOT, 'contracts/out', file, `${contract}.json`), 'utf8'));
  return { abi: json.abi as Abi, bytecode: json.bytecode.object as Hex };
}

// ---------- Native side ----------

export async function nativeApi(): Promise<ApiPromise> {
  await cryptoWaitReady();
  return ApiPromise.create({ provider: new WsProvider(SUBSTRATE_WS), noInitWarn: true });
}

export function nativeAdmin(): KeyringPair {
  return new Keyring({ type: 'sr25519', ss58Format: 42 }).addFromUri(requireEnv('NATIVE_ADMIN_MNEMONIC'));
}

/** The native AccountId32 (SS58) that Revive maps an H160 to — fund this to give an EVM account tPOT. */
export async function mappedAccount(api: ApiPromise, h160: Address): Promise<string> {
  const id = await api.call.reviveApi.accountId(h160);
  return encodeAddress(id.toU8a(), 42);
}

export async function freeBalance(api: ApiPromise, who: string): Promise<bigint> {
  const { data } = await api.query.system.account(who);
  return data.free.toBigInt();
}

export function fmt(amount: bigint, decimals: number, digits = 4): string {
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const frac = (abs % base).toString().padStart(decimals, '0').slice(0, digits).replace(/0+$/, '');
  return `${neg ? '-' : ''}${abs / base}${frac ? `.${frac}` : ''}`;
}

export interface NativeReceipt {
  txHash: string;
  blockHash: string;
  blockNumber: number;
  extrinsicIndex: number;
  events: { section: string; method: string; data: unknown }[];
}

/** Sign, submit and wait for inclusion. Rejects with the decoded module error if dispatch fails. */
export function sendNative(
  api: ApiPromise,
  tx: SubmittableExtrinsic<'promise'>,
  signer: KeyringPair,
): Promise<NativeReceipt> {
  return new Promise((resolvePromise, reject) => {
    let unsub: (() => void) | undefined;
    tx.signAndSend(signer, async (result: ISubmittableResult) => {
      if (result.dispatchError) {
        unsub?.();
        const err = result.dispatchError;
        if (err.isModule) {
          const meta = api.registry.findMetaError(err.asModule);
          reject(new Error(`${meta.section}.${meta.name}: ${meta.docs.join(' ')}`));
        } else reject(new Error(err.toString()));
        return;
      }
      if (result.status.isInBlock) {
        unsub?.();
        const blockHash = result.status.asInBlock.toHex();
        const header = await api.rpc.chain.getHeader(blockHash);
        resolvePromise({
          txHash: tx.hash.toHex(),
          blockHash,
          blockNumber: header.number.toNumber(),
          extrinsicIndex: (result as ISubmittableResult & { txIndex?: number }).txIndex ?? -1,
          events: result.events.map(({ event }) => ({
            section: event.section,
            method: event.method,
            data: event.data.toHuman(),
          })),
        });
      }
    })
      .then((u) => {
        unsub = u;
      })
      .catch(reject);
  });
}
