import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getAddress, type Address } from 'viem';
import {
  allocate,
  buildSnapshot,
  buildTree,
  eligibleTotals,
  serializeSnapshot,
  snapshotHash,
  verifySnapshot,
  type CreatorViews,
} from '../src/index';
import { FIXTURE_DIR, GOLDEN_CASES, goldenJson } from '../src/fixtures';

const a = (n: number): Address => getAddress(`0x${n.toString(16).padStart(40, '0')}`);
const M = 1_000_000n;

// Small deterministic PRNG so property tests are reproducible.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe('eligibleTotals', () => {
  it('drops submissions below minViews and sums per wallet case-insensitively', () => {
    const totals = eligibleTotals(
      [
        { account: a(2).toLowerCase(), views: 50n },
        { account: a(1), views: 99n }, // below minViews
        { account: a(2), views: 150n },
        { account: a(1), views: 100n },
      ],
      100n,
    );
    expect(totals).toEqual([
      { account: a(1), eligibleViews: 100n },
      { account: a(2), eligibleViews: 150n },
    ]);
  });
});

describe('allocate', () => {
  it('splits pro-rata when nobody hits the cap', () => {
    const r = allocate(
      [
        { account: a(1), eligibleViews: 1n },
        { account: a(2), eligibleViews: 3n },
      ],
      1_000n * M,
      1_000n * M,
    );
    expect(r.allocations.map((x) => x.amount)).toEqual([250n * M, 750n * M]);
    expect(r.leftover).toBe(0n);
  });

  it('caps and re-splits the excess (water-filling)', () => {
    const c = GOLDEN_CASES.find((x) => x.name === 'capped-refill')!;
    const r = allocate(c.creators, c.pool, c.cap);
    expect(r.allocations.map((x) => x.amount)).toEqual([200n * M, 400n * M, 400n * M]);
    expect(r.totalAllocated).toBe(c.pool);
  });

  it('refunds the surplus when every creator is capped', () => {
    const c = GOLDEN_CASES.find((x) => x.name === 'all-capped-leftover')!;
    const r = allocate(c.creators, c.pool, c.cap);
    expect(r.allocations.every((x) => x.amount === c.cap)).toBe(true);
    expect(r.leftover).toBe(600n * M);
  });

  it('rejects duplicates and non-positive views', () => {
    expect(() => allocate([{ account: a(1), eligibleViews: 1n }, { account: a(1), eligibleViews: 2n }], 10n, 10n)).toThrow(/duplicate/);
    expect(() => allocate([{ account: a(1), eligibleViews: 0n }], 10n, 10n)).toThrow(/non-positive/);
  });

  it('returns nothing for no creators', () => {
    expect(allocate([], 100n, 10n)).toEqual({ allocations: [], totalAllocated: 0n, leftover: 100n });
  });

  it('holds its invariants on random inputs', () => {
    const rand = rng(42);
    for (let run = 0; run < 500; run++) {
      const n = 1 + Math.floor(rand() * 12);
      const creators: CreatorViews[] = Array.from({ length: n }, (_, i) => ({
        account: a(i + 1),
        eligibleViews: BigInt(1 + Math.floor(rand() * 1_000_000)),
      }));
      const pool = BigInt(Math.floor(rand() * 1e12));
      const cap = BigInt(1 + Math.floor(rand() * 1e12));
      const r = allocate(creators, pool, cap);

      expect(r.totalAllocated + r.leftover).toBe(pool);
      expect(r.totalAllocated <= pool).toBe(true);
      for (const x of r.allocations) expect(x.amount <= cap).toBe(true);
      // If not every creator is capped, only rounding dust (< n) may be left over.
      if (r.allocations.filter((x) => x.amount === cap).length < n && cap * BigInt(n) > pool) {
        expect(r.leftover < BigInt(n)).toBe(true);
      }
      // More views never means a smaller payout.
      const amt = new Map(r.allocations.map((x) => [x.account, x.amount]));
      const sorted = [...creators].sort((p, q) => (p.eligibleViews < q.eligibleViews ? -1 : 1));
      for (let i = 1; i < sorted.length; i++) {
        expect((amt.get(sorted[i].account) ?? 0n) >= (amt.get(sorted[i - 1].account) ?? 0n)).toBe(true);
      }
      // Input order does not matter.
      expect(allocate([...creators].reverse(), pool, cap)).toEqual(r);
    }
  });
});

describe('tree', () => {
  it('produces proofs for every payout and a stable root', () => {
    const t1 = buildTree([{ account: a(1), amount: 5n }, { account: a(2), amount: 7n }]);
    const t2 = buildTree([{ account: a(1), amount: 5n }, { account: a(2), amount: 7n }]);
    expect(t1.root).toBe(t2.root);
    expect(t1.payouts.every((p) => p.proof.length > 0)).toBe(true);
    expect(() => buildTree([])).toThrow();
  });
});

describe('snapshot', () => {
  const input = {
    chainId: 420420777,
    contract: a(0xc0),
    campaignId: 1n,
    token: a(0xa0),
    pool: 1_000n * M,
    capPerCreator: 400n * M,
    minViews: 100n,
    takenAt: new Date('2026-10-23T00:00:00Z'),
    creators: GOLDEN_CASES.find((x) => x.name === 'capped-refill')!.creators,
  };

  it('is canonical: same input, same bytes, same hash', () => {
    const b1 = serializeSnapshot(buildSnapshot(input));
    const b2 = serializeSnapshot(buildSnapshot({ ...input, creators: [...input.creators].reverse() }));
    expect(snapshotHash(b1)).toBe(snapshotHash(b2));
    expect(snapshotHash(b1)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('verifies an honest snapshot against on-chain values', () => {
    const s = buildSnapshot(input);
    const bytes = serializeSnapshot(s);
    const res = verifySnapshot(s, { root: s.root, totalAllocated: BigInt(s.totalAllocated), hash: snapshotHash(bytes), bytes });
    expect(res.problems).toEqual([]);
  });

  it('flags tampered allocations, roots and content hashes', () => {
    const s = buildSnapshot(input);
    const tampered = { ...s, allocations: s.allocations.map((x, i) => (i === 0 ? { ...x, amount: (BigInt(x.amount) + 1n).toString() } : x)) };
    expect(verifySnapshot(tampered).ok).toBe(false);
    expect(verifySnapshot(s, { root: `0x${'ab'.repeat(32)}` }).ok).toBe(false);
    expect(verifySnapshot(s, { hash: `0x${'00'.repeat(32)}`, bytes: serializeSnapshot(s) }).ok).toBe(false);
  });
});

describe('golden fixtures', () => {
  it.each(GOLDEN_CASES.map((c) => [c.name, c] as const))('%s matches the committed file', (name, c) => {
    const onDisk = JSON.parse(readFileSync(resolve(FIXTURE_DIR, `${name}.json`), 'utf8'));
    expect(onDisk).toEqual(goldenJson(c));
  });
});
