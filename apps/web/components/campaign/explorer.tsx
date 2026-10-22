'use client';

import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { CampaignStatus } from '@reachpot/core';
import { ButtonLink } from '@/components/ui/button';
import { usePoll } from '@/lib/client/api';
import type { CampaignSummary } from '@/lib/shared/protocol';
import { CampaignCard } from './campaign-card';

const LIVE = new Set([CampaignStatus.Scheduled, CampaignStatus.Open, CampaignStatus.Measuring, CampaignStatus.AwaitingRoot, CampaignStatus.Disputable]);

export function CampaignExplorer() {
  const { data, error, loading } = usePoll<CampaignSummary[]>('/api/campaigns', 8000);
  const live = (data ?? []).filter((c) => LIVE.has(c.status));
  const done = (data ?? []).filter((c) => !LIVE.has(c.status));

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-32 sm:px-8">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl space-y-3">
          <h1 className="text-[clamp(36px,4.5vw,52px)] leading-[1.02]">Campaigns</h1>
          <p className="text-[17px] leading-relaxed">Post a Short for any open campaign. When it closes, the pot splits by views and lands in your Portaldot wallet.</p>
        </div>
        <ButtonLink href="/campaigns/new" chevron size="lg">
          Start a campaign
        </ButtonLink>
      </header>

      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-[14px] text-bad">{error}</p>}
      {loading && !data && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-72 rounded-card" />
          ))}
        </div>
      )}
      {data && data.length === 0 && (
        <div className="grid place-items-center rounded-card bg-surface px-6 py-20 text-center shadow-soft ring-1 ring-line">
          <span className="app-icon mb-5 grid size-14 place-items-center rounded-2xl text-white"><Sparkles className="size-6" /></span>
          <h2 className="text-[26px]">No campaigns yet</h2>
          <p className="mt-2 max-w-sm">Be the first brand to lock a pot. Creators will see it here the moment it is on-chain.</p>
          <ButtonLink href="/campaigns/new" chevron className="mt-6">
            Start a campaign
          </ButtonLink>
        </div>
      )}

      {live.length > 0 && <Grid title="Live" items={live} />}
      {done.length > 0 && <Grid title="Paid out" items={done} />}
    </div>
  );
}

function Grid({ title, items }: { title: string; items: CampaignSummary[] }) {
  return (
    <section className="mb-14">
      <h2 className="mb-5 text-[15px] font-semibold tracking-[-0.01em] text-faint">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}>
            <CampaignCard c={c} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
