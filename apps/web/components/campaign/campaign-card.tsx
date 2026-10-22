'use client';

import Link from 'next/link';
import { ArrowUpRight, Eye, Users } from 'lucide-react';
import { CampaignStatus, compact } from '@reachpot/core';
import { Amount, Countdown, StatusPill } from '@/components/common/bits';
import type { CampaignSummary } from '@/lib/shared/protocol';

function nextDeadline(c: CampaignSummary): { label: string; at: number } | null {
  if (c.status === CampaignStatus.Scheduled) return { label: 'Starts in', at: c.start };
  if (c.status === CampaignStatus.Open) return { label: 'Closes in', at: c.end };
  if (c.status === CampaignStatus.Measuring) return { label: 'Snapshot in', at: c.end + c.measurementDelay };
  return null;
}

export function CampaignCard({ c }: { c: CampaignSummary }) {
  const deadline = nextDeadline(c);
  return (
    <Link
      href={`/c/${c.id}`}
      className="group relative flex flex-col justify-between gap-8 rounded-card bg-surface p-6 shadow-soft ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusPill status={c.status} />
          <ArrowUpRight className="size-4 text-faint transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
        </div>
        <div className="space-y-1">
          <p className="text-[13px] font-semibold text-faint">{c.brandName}</p>
          <h3 className="text-[21px] leading-tight">{c.title}</h3>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-[13px] font-semibold text-faint">Pot</p>
          <Amount value={c.pool} decimals={c.token.decimals} symbol={c.token.symbol} className="text-[30px] font-semibold tracking-[-0.04em] text-ink" />
        </div>
        <div className="flex items-center justify-between border-t border-line pt-4 text-[13px]">
          <span className="flex items-center gap-3 text-muted">
            <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{c.creators}</span>
            <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{compact(BigInt(c.totalViews))}</span>
          </span>
          {deadline && (
            <span className="text-muted">
              {deadline.label} <Countdown to={deadline.at} className="font-semibold text-ink" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
