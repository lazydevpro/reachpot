// Shared by client and server: how off-chain campaign rules and creator submissions are bound to on-chain state.
import { keccak256, toBytes, type Address, type Hex } from 'viem';

export const RULES_SCHEMA = 'reachpot.rules/v1';

export interface CampaignRules {
  title: string;
  brief: string;
  brandName: string;
  platform: 'youtube-shorts';
  minViews: string;
}

/** Canonical JSON (fixed key order) — its keccak256 is pinned on-chain as `rulesHash` at campaign creation. */
export function rulesJson(r: CampaignRules): string {
  return JSON.stringify({
    schema: RULES_SCHEMA,
    title: r.title.trim(),
    brief: r.brief.trim(),
    brandName: r.brandName.trim(),
    platform: r.platform,
    minViews: r.minViews,
  });
}

export const rulesHash = (r: CampaignRules): Hex => keccak256(toBytes(rulesJson(r)));

/** The message a creator signs with their Portaldot wallet to submit a Short (binds video → payout account). */
export function submissionMessage(p: { contract: Address; campaignId: number; videoId: string; creator: string }): string {
  return [`Reachpot submission`, `campaign: ${p.contract.toLowerCase()}#${p.campaignId}`, `video: ${p.videoId}`, `creator: ${p.creator}`].join('\n');
}

/** Short code the creator puts in the Short's description to prove they own the channel. */
export function bindingCode(contract: Address, campaignId: number, creator: string): string {
  return `rp-${keccak256(toBytes(`${contract.toLowerCase()}#${campaignId}#${creator}`)).slice(2, 8)}`;
}

/** Extracts an 11-char YouTube video id from Shorts / watch / youtu.be URLs (or a bare id). */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'music.youtube.com') {
      if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2];
      else if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- API types

export interface AssetInfo {
  id: number;
  symbol: string;
  name: string;
  decimals: number;
  precompile: Address;
  pool?: { lpToken: number; tx: string };
}

export interface PublicDeployment {
  network: string;
  chainId: number;
  reachpot: Address;
  oracle: Address;
  guardian: Address;
  windows: { disputeWindow: number; minMeasurementDelay: number; rootTimeout: number; claimWindow: number };
  native: { decimals: number; symbol: string; nativeToEthRatio: string };
  assets: AssetInfo[];
  badgeCollection: number;
  viewsSource: 'mock' | 'youtube';
}

export interface CampaignSummary {
  id: number;
  title: string;
  brandName: string;
  brand: Address;
  token: { address: Address; symbol: string; decimals: number; assetId: number | null };
  pool: string;
  capPerCreator: string;
  minViews: string;
  start: number;
  end: number;
  measurementDelay: number;
  status: number;
  creators: number;
  submissions: number;
  totalViews: string;
}

export interface SubmissionView {
  id: number;
  videoId: string;
  videoUrl: string;
  title: string | null;
  creator: string;
  payoutH160: Address;
  status: 'pending' | 'verified' | 'rejected';
  rejectReason: string | null;
  views: string;
  viewsUpdatedAt: string | null;
  bindingCode: string;
  createdAt: string;
}

export interface SnapshotView {
  hash: Hex;
  block: number;
  index: number;
  storeTx: string;
  root: Hex;
  rootTx: string;
  totalAllocated: string;
  createdAt: string;
}

export interface PayoutView {
  account: Address;
  creator: string | null;
  amount: string;
  status: 'paid' | 'failed';
  txHash: string;
  createdAt: string;
}

export interface CampaignDetail extends CampaignSummary {
  brief: string;
  rulesHash: Hex;
  createTx: string;
  root: Hex | null;
  rootPostedAt: number;
  totalAllocated: string;
  claimed: string;
  refunded: string;
  refundable: string;
  snapshot: SnapshotView | null;
  submissionsList: SubmissionView[];
  payouts: PayoutView[];
  activity: { at: string; kind: string; message: string; tx: string | null }[];
}

export interface CreatorDashboard {
  creator: string;
  payoutH160: Address;
  mapped: boolean;
  native: { free: string };
  balances: { assetId: number; symbol: string; decimals: number; amount: string }[];
  submissions: (SubmissionView & { campaignId: number; campaignTitle: string; tokenSymbol: string })[];
  payouts: (PayoutView & { campaignId: number; campaignTitle: string; tokenSymbol: string; tokenDecimals: number })[];
  badge: { collection: number; item: number; attributes: Record<string, string>; mintTx: string | null } | null;
}
