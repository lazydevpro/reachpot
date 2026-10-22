'use client';

import { Check } from 'lucide-react';
import { CampaignStatus } from '@reachpot/core';
import { Countdown } from '@/components/common/bits';
import type { CampaignDetail, PublicDeployment } from '@/lib/shared/protocol';
import { cn } from '@/lib/utils';

export function Timeline({ c, d }: { c: CampaignDetail; d: PublicDeployment }) {
  const measured = c.end + c.measurementDelay;
  const disputeEnds = c.rootPostedAt ? c.rootPostedAt + d.windows.disputeWindow : 0;
  const paid = c.payouts.some((p) => p.status === 'paid');
  const steps = [
    { label: 'Submissions open', done: c.status > CampaignStatus.Open, active: c.status <= CampaignStatus.Open, until: c.status <= CampaignStatus.Open ? c.end : undefined },
    { label: 'Counting final views', done: c.status > CampaignStatus.Measuring, active: c.status === CampaignStatus.Measuring, until: c.status === CampaignStatus.Measuring ? measured : undefined },
    { label: 'Snapshot stored on-chain', done: Boolean(c.snapshot), active: c.status === CampaignStatus.AwaitingRoot && !c.snapshot },
    { label: 'Dispute window', done: c.status > CampaignStatus.Disputable && Boolean(c.root), active: c.status === CampaignStatus.Disputable, until: c.status === CampaignStatus.Disputable ? disputeEnds : undefined },
    { label: 'Creators paid', done: paid, active: c.status === CampaignStatus.Payable && !paid },
  ];
  return (
    <ol className="relative grid gap-0 sm:grid-cols-5">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-5 sm:flex-col sm:pb-0">
          {i < steps.length - 1 && (
            <span className={cn('absolute left-[13px] top-7 h-[calc(100%-20px)] w-px sm:left-7 sm:top-[13px] sm:h-px sm:w-[calc(100%-20px)]', s.done ? 'bg-good' : 'bg-line-strong')} aria-hidden />
          )}
          <span
            className={cn(
              'relative z-10 grid size-[27px] shrink-0 place-items-center rounded-full text-[12px] font-bold ring-4 ring-surface',
              s.done ? 'bg-good text-white' : s.active ? 'bg-ink text-white' : 'bg-sunken text-faint',
            )}
          >
            {s.done ? <Check className="size-3.5" /> : s.active ? <span className="size-2 animate-pulse rounded-full bg-white" /> : i + 1}
          </span>
          <span className="space-y-0.5 sm:pr-3">
            <span className={cn('block text-[14px] font-semibold tracking-[-0.01em]', s.done || s.active ? 'text-ink' : 'text-faint')}>{s.label}</span>
            {s.until !== undefined && (
              <span className="block text-[13px] text-muted">
                ends in <Countdown to={s.until} className="font-semibold text-ink" />
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
