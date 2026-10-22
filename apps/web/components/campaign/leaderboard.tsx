'use client';

import { motion } from 'motion/react';
import { CheckCircle2, Crown } from 'lucide-react';
import { useMemo } from 'react';
import { compact, shortAddr } from '@reachpot/core';
import { allocate, eligibleTotals } from '@reachpot/allocation';
import { Amount } from '@/components/common/bits';
import type { CampaignDetail } from '@/lib/shared/protocol';
import { cn } from '@/lib/utils';

/** Live pro-rata standings. Before the snapshot it's a projection from current views; after, the final allocation. */
export function Leaderboard({ c }: { c: CampaignDetail }) {
  const rows = useMemo(() => {
    const verified = c.submissionsList.filter((s) => s.status === 'verified');
    const creators = eligibleTotals(verified.map((s) => ({ account: s.payoutH160, views: BigInt(s.views) })), BigInt(c.minViews));
    const { allocations } = allocate(creators, BigInt(c.pool), BigInt(c.capPerCreator));
    const amount = new Map(allocations.map((a) => [a.account.toLowerCase(), a.amount]));
    const who = new Map(c.submissionsList.map((s) => [s.payoutH160.toLowerCase(), s.creator]));
    const paid = new Map(c.payouts.filter((p) => p.status === 'paid').map((p) => [p.account.toLowerCase(), p]));
    const totalViews = creators.reduce((s, x) => s + x.eligibleViews, 0n) || 1n;
    return creators
      .map((x) => ({
        account: x.account,
        creator: who.get(x.account.toLowerCase()) ?? x.account,
        views: x.eligibleViews,
        share: Number((x.eligibleViews * 10_000n) / totalViews) / 100,
        amount: amount.get(x.account.toLowerCase()) ?? 0n,
        capped: (amount.get(x.account.toLowerCase()) ?? 0n) === BigInt(c.capPerCreator),
        paidTx: paid.get(x.account.toLowerCase())?.txHash,
      }))
      .sort((a, b) => (a.amount === b.amount ? Number(b.views - a.views) : a.amount > b.amount ? -1 : 1));
  }, [c]);

  if (rows.length === 0) {
    return <p className="rounded-tile bg-sunken/60 px-5 py-8 text-center text-[14px]">No eligible Shorts yet. Shorts need at least {Number(c.minViews).toLocaleString()} views to count.</p>;
  }
  const max = rows[0].amount || 1n;
  const final = Boolean(c.snapshot);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] px-1 text-[12.5px] font-semibold text-faint sm:grid-cols-[1fr_120px_160px]">
        <span>Creator</span>
        <span className="hidden text-right sm:block">Views</span>
        <span className="text-right">{final ? 'Payout' : 'Projected payout'}</span>
      </div>
      {rows.map((r, i) => (
        <motion.div layout key={r.account} transition={{ type: 'spring', stiffness: 500, damping: 40 }} className="relative overflow-hidden rounded-2xl bg-sunken/60 px-4 py-3">
          <motion.span
            className={cn('absolute inset-y-0 left-0 rounded-2xl', r.capped ? 'bg-accent-soft' : 'bg-[#ebe8f0]')}
            initial={false}
            animate={{ width: `${Number((r.amount * 1000n) / max) / 10}%` }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            aria-hidden
          />
          <div className="relative grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1fr_120px_160px]">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold', i === 0 ? 'app-icon text-white' : 'bg-surface text-ink-2 ring-1 ring-line')}>
                {i === 0 ? <Crown className="size-3.5" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-mono text-[13px] text-ink">{shortAddr(r.creator, 6, 6)}</span>
                <span className="block text-[12px] text-faint">
                  {r.share.toFixed(1)}% of views{r.capped && <span className="ml-1.5 font-semibold text-accent">· capped</span>}
                </span>
              </span>
            </span>
            <span className="hidden text-right text-[14px] tabular text-ink-2 sm:block">{compact(r.views)}</span>
            <span className="flex items-center justify-end gap-1.5 text-right">
              <Amount value={r.amount} decimals={c.token.decimals} symbol={c.token.symbol} className="text-[15px] font-semibold text-ink" />
              {r.paidTx && <CheckCircle2 className="size-4 text-good" aria-label="paid" />}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
