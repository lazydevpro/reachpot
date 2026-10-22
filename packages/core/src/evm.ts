import type { Address } from 'viem';

/** ERC-20 precompile instances configured in the runtime (`InlineIdConfig<0x1>` for Assets, `<0x2>` for PoolAssets). */
export const PRECOMPILE_PREFIX = { assets: 0x0001, poolAssets: 0x0002 } as const;

/** Native asset → ERC-20 address. Layout: [4-byte asset id][12 zero bytes][2-byte prefix][2 zero bytes]. */
export function assetPrecompileAddress(assetId: number, prefix: number = PRECOMPILE_PREFIX.assets): Address {
  if (!Number.isInteger(assetId) || assetId < 0 || assetId > 0xffffffff) throw new Error(`bad asset id ${assetId}`);
  return `0x${assetId.toString(16).padStart(8, '0')}${'0'.repeat(24)}${prefix.toString(16).padStart(4, '0')}0000` as Address;
}

/** Inverse of `assetPrecompileAddress`; returns undefined for non-precompile addresses. */
export function assetIdFromPrecompile(address: string, prefix: number = PRECOMPILE_PREFIX.assets): number | undefined {
  const a = address.toLowerCase();
  const tail = `${'0'.repeat(24)}${prefix.toString(16).padStart(4, '0')}0000`;
  if (!/^0x[0-9a-f]{40}$/.test(a) || a.slice(10) !== tail) return undefined;
  return parseInt(a.slice(2, 10), 16);
}

export enum CampaignStatus {
  None,
  Scheduled,
  Open,
  Measuring,
  AwaitingRoot,
  Disputable,
  Payable,
  Expired,
  Abandoned,
}

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  [CampaignStatus.None]: 'Unknown',
  [CampaignStatus.Scheduled]: 'Starting soon',
  [CampaignStatus.Open]: 'Open',
  [CampaignStatus.Measuring]: 'Counting views',
  [CampaignStatus.AwaitingRoot]: 'Snapshot pending',
  [CampaignStatus.Disputable]: 'In dispute window',
  [CampaignStatus.Payable]: 'Paying out',
  [CampaignStatus.Expired]: 'Closed',
  [CampaignStatus.Abandoned]: 'Refunded',
};
