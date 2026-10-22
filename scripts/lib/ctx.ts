// Shared script context: network selection (`--network local|testnet`, default local), clients and signers.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { Keyring } from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { LOCAL_DEV, evmChain, getNetwork, type Deployment, type NetworkConfig } from '@reachpot/core';
import { chainUnits, connectNative } from '@reachpot/core/native';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '../..');
loadEnv({ path: resolve(ROOT, '.env'), quiet: true });

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export const net: NetworkConfig = getNetwork(arg('network') ?? process.env.NETWORK ?? 'local');

function envKey(name: string): Hex | undefined {
  const v = process.env[name];
  return v ? (v.startsWith('0x') ? (v as Hex) : (`0x${v}` as Hex)) : undefined;
}

function required<T>(v: T | undefined, what: string): T {
  if (!v) throw new Error(`${what} is not set in .env (needed for --network ${net.name})`);
  return v;
}

/** EVM roles. Local uses the eth-rpc dev accounts; testnet uses keys from .env. */
export function evmRoles(): Record<'deployer' | 'oracle' | 'guardian' | 'brand', PrivateKeyAccount> {
  if (net.name === 'local') {
    const k = LOCAL_DEV.evm;
    return {
      deployer: privateKeyToAccount(k.deployer.key),
      oracle: privateKeyToAccount(k.oracle.key),
      guardian: privateKeyToAccount(k.guardian.key),
      brand: privateKeyToAccount(k.brand.key),
    };
  }
  const deployer = privateKeyToAccount(required(envKey('DEPLOYER_PRIVATE_KEY'), 'DEPLOYER_PRIVATE_KEY'));
  return {
    deployer,
    oracle: envKey('ORACLE_PRIVATE_KEY') ? privateKeyToAccount(envKey('ORACLE_PRIVATE_KEY')!) : deployer,
    guardian: envKey('GUARDIAN_PRIVATE_KEY') ? privateKeyToAccount(envKey('GUARDIAN_PRIVATE_KEY')!) : deployer,
    brand: envKey('BRAND_PRIVATE_KEY') ? privateKeyToAccount(envKey('BRAND_PRIVATE_KEY')!) : deployer,
  };
}

export function evmClients(account: PrivateKeyAccount) {
  const chain = evmChain(net);
  const transport = http(net.evmRpc, { timeout: 120_000 });
  return {
    publicClient: createPublicClient({ chain, transport, pollingInterval: 1_000 }),
    walletClient: createWalletClient({ account, chain, transport }),
  };
}

const keyring = () => new Keyring({ type: 'sr25519', ss58Format: 42 });

/** Native admin: asset owner, badge-collection owner, TransactionStorage publisher (the keeper's native identity). */
export async function nativeAdmin(): Promise<KeyringPair> {
  await cryptoWaitReady();
  if (net.name === 'local') return keyring().addFromUri(LOCAL_DEV.native.admin);
  return keyring().addFromUri(required(process.env.NATIVE_ADMIN_MNEMONIC, 'NATIVE_ADMIN_MNEMONIC'));
}

/** Demo creators (local only). */
export async function localCreators(): Promise<KeyringPair[]> {
  await cryptoWaitReady();
  if (net.name !== 'local') throw new Error('demo creators only exist on the local chain');
  return LOCAL_DEV.native.creators.map((u) => keyring().addFromUri(u));
}

/**
 * Demo creators for scripted runs: local dev accounts, or on testnet throwaway sr25519 keys kept in .env
 * (CREATOR_MNEMONIC_1..n, generated on first use, never printed).
 */
export async function demoCreators(n: number): Promise<KeyringPair[]> {
  if (net.name === 'local') return (await localCreators()).slice(0, n);
  await cryptoWaitReady();
  const { mnemonicGenerate } = await import('@polkadot/util-crypto');
  const { appendFileSync } = await import('node:fs');
  const out: KeyringPair[] = [];
  for (let i = 1; i <= n; i++) {
    const name = `CREATOR_MNEMONIC_${i}`;
    if (!process.env[name]) {
      process.env[name] = mnemonicGenerate(12);
      appendFileSync(resolve(ROOT, '.env'), `\n# Throwaway TESTNET demo creator ${i}. Never use on mainnet.\n${name}="${process.env[name]}"\n`, { mode: 0o600 });
    }
    out.push(keyring().addFromUri(process.env[name]!));
  }
  return out;
}

export async function native() {
  const api = await connectNative(net.ws);
  await api.isReady;
  return { api, units: chainUnits(api) };
}

export const deploymentPath = () => resolve(ROOT, 'deployments', `${net.name}.json`);

export function loadDeployment(): Deployment {
  const p = deploymentPath();
  if (!existsSync(p)) throw new Error(`no deployment for ${net.name}: run \`pnpm deploy:${net.name}\` first`);
  return JSON.parse(readFileSync(p, 'utf8')) as Deployment;
}

export const short = (e: unknown) => (e as Error).message.split('\n').slice(0, 2).join(' | ');
