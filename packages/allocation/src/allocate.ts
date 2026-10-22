import { getAddress, type Address } from 'viem';

export interface Submission {
  account: string;
  views: bigint;
}

export interface CreatorViews {
  account: Address;
  eligibleViews: bigint;
}

export interface Allocation {
  account: Address;
  amount: bigint;
}

export interface AllocationResult {
  allocations: Allocation[];
  totalAllocated: bigint;
  leftover: bigint;
}

const byAccount = (a: { account: string }, b: { account: string }) =>
  a.account.toLowerCase() < b.account.toLowerCase() ? -1 : a.account.toLowerCase() > b.account.toLowerCase() ? 1 : 0;

/** Drop submissions below `minViews`, then sum eligible views per creator wallet (sorted by address). */
export function eligibleTotals(submissions: readonly Submission[], minViews: bigint): CreatorViews[] {
  const totals = new Map<Address, bigint>();
  for (const s of submissions) {
    if (s.views < 0n) throw new Error(`negative views for ${s.account}`);
    if (s.views < minViews) continue;
    const account = getAddress(s.account);
    totals.set(account, (totals.get(account) ?? 0n) + s.views);
  }
  return [...totals]
    .filter(([, v]) => v > 0n)
    .map(([account, eligibleViews]) => ({ account, eligibleViews }))
    .sort(byAccount);
}

/**
 * Water-filling pro-rata split. Each creator gets `pool * views / totalViews`, but never more than `cap`; whatever a
 * capped creator can't take is re-split among the others, until nobody exceeds the cap. Integer (floor) math, so
 * the result is deterministic and `totalAllocated <= pool`; rounding dust and any surplus stay with the brand.
 */
export function allocate(creators: readonly CreatorViews[], pool: bigint, cap: bigint): AllocationResult {
  if (pool < 0n || cap <= 0n) throw new Error('pool must be >= 0 and cap > 0');
  const seen = new Set<string>();
  for (const c of creators) {
    const key = c.account.toLowerCase();
    if (seen.has(key)) throw new Error(`duplicate creator ${c.account}`);
    if (c.eligibleViews <= 0n) throw new Error(`non-positive views for ${c.account}`);
    seen.add(key);
  }

  let active = [...creators].sort(byAccount);
  let remaining = pool;
  const amounts = new Map<Address, bigint>();

  while (active.length > 0 && remaining > 0n) {
    const totalViews = active.reduce((s, c) => s + c.eligibleViews, 0n);
    // remaining * v / V >= cap  <=>  remaining * v >= cap * V  (no rounding involved)
    const capped = active.filter((c) => remaining * c.eligibleViews >= cap * totalViews);
    if (capped.length === 0) {
      for (const c of active) amounts.set(c.account, (remaining * c.eligibleViews) / totalViews);
      break;
    }
    for (const c of capped) {
      const amount = cap <= remaining ? cap : remaining;
      amounts.set(c.account, amount);
      remaining -= amount;
    }
    const cappedSet = new Set(capped.map((c) => c.account));
    active = active.filter((c) => !cappedSet.has(c.account));
  }

  const allocations = [...amounts]
    .filter(([, amount]) => amount > 0n)
    .map(([account, amount]) => ({ account, amount }))
    .sort(byAccount);
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0n);
  return { allocations, totalAllocated, leftover: pool - totalAllocated };
}
