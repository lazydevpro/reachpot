// Server-side chain access: shared viem clients, oracle signer, native API + admin keypair, contract reads.
import { Keyring } from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import type { ApiPromise } from '@polkadot/api';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CampaignStatus, campaignFromTuple, evmChain, reachpotAbi } from '@reachpot/core';
import { connectNative } from '@reachpot/core/native';
import { deployment, nativeAdminUri, network, oracleKey } from './env';

const chain = evmChain(network);
const transport = http(network.evmRpc, { timeout: 120_000 });

export const publicClient = createPublicClient({ chain, transport, pollingInterval: 1_000 });

export function oracleWallet() {
  return createWalletClient({ account: privateKeyToAccount(oracleKey()), chain, transport });
}

const g = globalThis as unknown as { __reachpotApi?: Promise<ApiPromise>; __reachpotAdmin?: Promise<KeyringPair> };

export function nativeApi(): Promise<ApiPromise> {
  if (!g.__reachpotApi) {
    g.__reachpotApi = connectNative(network.ws).then(async (api) => {
      await api.isReady;
      return api;
    });
    g.__reachpotApi.catch(() => (g.__reachpotApi = undefined));
  }
  return g.__reachpotApi;
}

export function nativeAdmin(): Promise<KeyringPair> {
  g.__reachpotAdmin ??= cryptoWaitReady().then(() => new Keyring({ type: 'sr25519', ss58Format: 42 }).addFromUri(nativeAdminUri()));
  return g.__reachpotAdmin;
}

export interface OnchainCampaign {
  brand: Address;
  token: Address;
  pool: bigint;
  start: number;
  end: number;
  measurementDelay: number;
  capPerCreator: bigint;
  minViews: bigint;
  rulesHash: Hex;
  root: Hex;
  totalAllocated: bigint;
  claimed: bigint;
  refunded: bigint;
  rootPostedAt: number;
  snapshotHash: Hex;
  snapshotBlock: number;
  snapshotIndex: number;
  status: CampaignStatus;
  refundable: bigint;
}

const ZERO = `0x${'0'.repeat(64)}` as Hex;

export async function readCampaign(id: number): Promise<OnchainCampaign | null> {
  const address = deployment().reachpot.address;
  const [tuple, status, refundable] = await Promise.all([
    publicClient.readContract({ address, abi: reachpotAbi, functionName: 'campaigns', args: [BigInt(id)] }),
    publicClient.readContract({ address, abi: reachpotAbi, functionName: 'status', args: [BigInt(id)] }),
    publicClient.readContract({ address, abi: reachpotAbi, functionName: 'refundable', args: [BigInt(id)] }),
  ]);
  const c = campaignFromTuple(tuple);
  if (c.brand === '0x0000000000000000000000000000000000000000') return null;
  return {
    brand: c.brand,
    token: c.token,
    pool: c.pool,
    start: Number(c.start),
    end: Number(c.end),
    measurementDelay: Number(c.measurementDelay),
    capPerCreator: c.capPerCreator,
    minViews: c.minViews,
    rulesHash: c.rulesHash,
    root: c.root === ZERO ? ZERO : c.root,
    totalAllocated: c.totalAllocated,
    claimed: c.claimed,
    refunded: c.refunded,
    rootPostedAt: Number(c.rootPostedAt),
    snapshotHash: c.snapshotHash,
    snapshotBlock: Number(c.snapshotBlock),
    snapshotIndex: Number(c.snapshotIndex),
    status: Number(status) as CampaignStatus,
    refundable,
  };
}

export const isZeroHash = (h: Hex) => h === ZERO;
