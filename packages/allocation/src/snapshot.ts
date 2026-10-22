import { blake2b } from '@noble/hashes/blake2.js';
import { bytesToHex, getAddress, type Address, type Hex } from 'viem';
import { allocate, type CreatorViews } from './allocate.js';
import { buildTree } from './tree.js';

export const SNAPSHOT_SCHEMA = 'reachpot.snapshot/v1';

/**
 * What the oracle publishes to Portaldot `TransactionStorage` before posting a root. It carries only what is needed to
 * recompute the payout root: per-creator eligible view totals and the resulting allocations, not per-video statistics.
 */
export interface Snapshot {
  schema: typeof SNAPSHOT_SCHEMA;
  chainId: number;
  contract: Address;
  campaignId: string;
  token: Address;
  pool: string;
  capPerCreator: string;
  minViews: string;
  takenAt: string;
  creators: { account: Address; eligibleViews: string }[];
  allocations: { account: Address; amount: string }[];
  totalAllocated: string;
  root: Hex;
}

export interface SnapshotInput {
  chainId: number;
  contract: string;
  campaignId: bigint;
  token: string;
  pool: bigint;
  capPerCreator: bigint;
  minViews: bigint;
  takenAt: Date;
  creators: readonly CreatorViews[];
}

export function buildSnapshot(input: SnapshotInput): Snapshot {
  const { allocations, totalAllocated } = allocate(input.creators, input.pool, input.capPerCreator);
  const { root } = buildTree(allocations);
  // Key order is fixed here, so serialization (and therefore the content hash) is canonical.
  return {
    schema: SNAPSHOT_SCHEMA,
    chainId: input.chainId,
    contract: getAddress(input.contract),
    campaignId: input.campaignId.toString(),
    token: getAddress(input.token),
    pool: input.pool.toString(),
    capPerCreator: input.capPerCreator.toString(),
    minViews: input.minViews.toString(),
    takenAt: input.takenAt.toISOString(),
    creators: [...input.creators]
      .sort((a, b) => (a.account.toLowerCase() < b.account.toLowerCase() ? -1 : 1))
      .map((c) => ({ account: getAddress(c.account), eligibleViews: c.eligibleViews.toString() })),
    allocations: allocations.map((a) => ({ account: a.account, amount: a.amount.toString() })),
    totalAllocated: totalAllocated.toString(),
    root,
  };
}

export function serializeSnapshot(s: Snapshot): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(s));
}

/** blake2b-256 of the serialized bytes: the content hash `TransactionStorage` indexes the data under. */
export function snapshotHash(bytes: Uint8Array): Hex {
  return bytesToHex(blake2b(bytes, { dkLen: 32 }));
}

export interface VerifyResult {
  ok: boolean;
  problems: string[];
  recomputedRoot: Hex;
  recomputedTotal: bigint;
}

/** Recompute allocations and root from the snapshot's own inputs; report every mismatch. */
export function verifySnapshot(s: Snapshot, expected?: { root?: Hex; totalAllocated?: bigint; hash?: Hex; bytes?: Uint8Array }): VerifyResult {
  const problems: string[] = [];
  if (s.schema !== SNAPSHOT_SCHEMA) problems.push(`unknown schema ${s.schema}`);
  const creators = s.creators.map((c) => ({ account: getAddress(c.account), eligibleViews: BigInt(c.eligibleViews) }));
  const pool = BigInt(s.pool);
  const { allocations, totalAllocated } = allocate(creators, pool, BigInt(s.capPerCreator));
  const { root } = buildTree(allocations);

  const listed = new Map(s.allocations.map((a) => [a.account.toLowerCase(), BigInt(a.amount)]));
  if (listed.size !== allocations.length) problems.push(`snapshot lists ${listed.size} allocations, recomputed ${allocations.length}`);
  for (const a of allocations) {
    const got = listed.get(a.account.toLowerCase());
    if (got !== a.amount) problems.push(`allocation for ${a.account}: snapshot ${got ?? 'missing'}, recomputed ${a.amount}`);
  }
  if (BigInt(s.totalAllocated) !== totalAllocated) problems.push(`totalAllocated: snapshot ${s.totalAllocated}, recomputed ${totalAllocated}`);
  if (s.root !== root) problems.push(`root: snapshot ${s.root}, recomputed ${root}`);
  if (expected?.root && expected.root.toLowerCase() !== root.toLowerCase()) problems.push(`root: on-chain ${expected.root}, recomputed ${root}`);
  if (expected?.totalAllocated !== undefined && expected.totalAllocated !== totalAllocated) {
    problems.push(`totalAllocated: on-chain ${expected.totalAllocated}, recomputed ${totalAllocated}`);
  }
  if (expected?.hash && expected.bytes && snapshotHash(expected.bytes).toLowerCase() !== expected.hash.toLowerCase()) {
    problems.push(`content hash: on-chain ${expected.hash}, data hashes to ${snapshotHash(expected.bytes)}`);
  }
  return { ok: problems.length === 0, problems, recomputedRoot: root, recomputedTotal: totalAllocated };
}
