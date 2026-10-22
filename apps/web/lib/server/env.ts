// Server-only configuration: network, deployment file, signer secrets. Never import from client components.
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { Hex } from 'viem';
import { LOCAL_DEV, getNetwork, type Deployment } from '@reachpot/core';
import type { PublicDeployment } from '@/lib/shared/protocol';

/** Repo root (the app runs from apps/web). Root .env holds the testnet keys shared with scripts/. */
export const REPO_ROOT = resolve(process.cwd(), '../..');
loadEnv({ path: resolve(REPO_ROOT, '.env'), quiet: true });

export const network = getNetwork(process.env.NEXT_PUBLIC_NETWORK ?? 'local');

export const serverEnv = {
  network,
  viewsSource: (process.env.VIEWS_SOURCE ?? (process.env.YOUTUBE_API_KEY ? 'youtube' : 'mock')) as 'mock' | 'youtube',
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  keeperSecret: process.env.KEEPER_SECRET ?? (network.name === 'local' ? 'local-dev' : undefined),
  keeperIntervalMs: Number(process.env.KEEPER_INTERVAL_MS ?? (network.name === 'local' ? 4000 : 30000)),
  dataDir: process.env.PGLITE_DIR ?? resolve(process.cwd(), '.data', network.name),
  devTools: network.name === 'local' || process.env.ENABLE_DEV_TOOLS === '1',
};

function key(v: string | undefined): Hex | undefined {
  return v ? ((v.startsWith('0x') ? v : `0x${v}`) as Hex) : undefined;
}

export function oracleKey(): Hex {
  if (network.name === 'local') return LOCAL_DEV.evm.oracle.key;
  const k = key(process.env.ORACLE_PRIVATE_KEY) ?? key(process.env.DEPLOYER_PRIVATE_KEY);
  if (!k) throw new Error('ORACLE_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) is not set');
  return k;
}

export function nativeAdminUri(): string {
  if (network.name === 'local') return LOCAL_DEV.native.admin;
  const m = process.env.NATIVE_ADMIN_MNEMONIC;
  if (!m) throw new Error('NATIVE_ADMIN_MNEMONIC is not set');
  return m;
}

let cached: { mtimeMs: number; deployment: Deployment } | undefined;

/** Reads deployments/<network>.json (re-read when the file changes, e.g. after `pnpm deploy:local`). */
export function deployment(): Deployment {
  const path = resolve(REPO_ROOT, 'deployments', `${network.name}.json`);
  let mtimeMs: number;
  try {
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    throw new Error(`No deployment for ${network.name}. Run \`pnpm deploy:${network.name}\` first.`);
  }
  if (!cached || cached.mtimeMs !== mtimeMs) cached = { mtimeMs, deployment: JSON.parse(readFileSync(path, 'utf8')) };
  return cached.deployment;
}

export function publicDeployment(): PublicDeployment {
  const d = deployment();
  return {
    network: d.network,
    chainId: d.chainId,
    reachpot: d.reachpot.address,
    oracle: d.roles.oracle,
    guardian: d.roles.guardian,
    windows: d.windows,
    native: d.native,
    assets: d.assets,
    badgeCollection: d.badges.collection,
    viewsSource: serverEnv.viewsSource,
  };
}
