// Golden fixtures shared with the Foundry tests (contracts/test/Golden.t.sol): same allocations, same root, same proofs.
// Regenerate with `pnpm --filter @reachpot/allocation fixtures`; test/fixtures.test.ts fails if they drift.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAddress, type Address } from 'viem';
import { allocate, type CreatorViews } from './allocate';
import { buildTree } from './tree';

const acct = (n: number): Address => getAddress(`0x${n.toString(16).padStart(2, '0').repeat(20)}`);
const M = 1_000_000n; // 6-decimals asset

export interface GoldenCase {
  name: string;
  pool: bigint;
  cap: bigint;
  creators: CreatorViews[];
}

export const GOLDEN_CASES: GoldenCase[] = [
  {
    name: 'uncapped',
    pool: 1_000n * M,
    cap: 1_000n * M,
    creators: [
      { account: acct(0x11), eligibleViews: 100n },
      { account: acct(0x22), eligibleViews: 200n },
      { account: acct(0x33), eligibleViews: 700n },
    ],
  },
  {
    // 970-view creator capped at 400; the remaining 600 re-split 10:20 caps the 20-view creator too; 200 left for the last.
    name: 'capped-refill',
    pool: 1_000n * M,
    cap: 400n * M,
    creators: [
      { account: acct(0x11), eligibleViews: 10n },
      { account: acct(0x22), eligibleViews: 20n },
      { account: acct(0x33), eligibleViews: 970n },
    ],
  },
  {
    name: 'all-capped-leftover',
    pool: 1_000n * M,
    cap: 100n * M,
    creators: [0x11, 0x22, 0x33, 0x44].map((n, i) => ({ account: acct(n), eligibleViews: BigInt(1_000 * (i + 1)) })),
  },
  {
    name: 'rounding-dust',
    pool: 1_000n,
    cap: 1_000n,
    creators: [0x11, 0x22, 0x33].map((n) => ({ account: acct(n), eligibleViews: 1n })),
  },
  {
    name: 'single-creator',
    pool: 250n * M,
    cap: 100n * M,
    creators: [{ account: acct(0x55), eligibleViews: 42n }],
  },
];

export function goldenJson(c: GoldenCase) {
  const { allocations, totalAllocated, leftover } = allocate(c.creators, c.pool, c.cap);
  const { root, payouts } = buildTree(allocations);
  return {
    name: c.name,
    pool: c.pool.toString(),
    cap: c.cap.toString(),
    totalAllocated: totalAllocated.toString(),
    leftover: leftover.toString(),
    root,
    count: payouts.length,
    payouts: payouts.map((p) => ({ account: p.account, amount: p.amount.toString(), proof: p.proof })),
  };
}

export const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const c of GOLDEN_CASES) {
    writeFileSync(resolve(FIXTURE_DIR, `${c.name}.json`), `${JSON.stringify(goldenJson(c), null, 2)}\n`);
    console.log(`wrote fixtures/${c.name}.json`);
  }
}
