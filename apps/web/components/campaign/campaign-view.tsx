'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Rocket, Undo2, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CampaignStatus, compact, fmtUnits, reachpotAbi, shortAddr } from '@reachpot/core';
import { Amount, Copyable, ShortThumb, StatusPill, Stat } from '@/components/common/bits';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { apiPost, usePoll } from '@/lib/client/api';
import { useDeployment } from '@/lib/client/deployment';
import { publicClient, useEvmWallet } from '@/lib/client/evm-wallet';
import { publicConfig } from '@/lib/config';
import type { CampaignDetail, PublicDeployment } from '@/lib/shared/protocol';
import { Leaderboard } from './leaderboard';
import { Timeline } from './timeline';
import { VerifyPanel } from './verify-panel';

export function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const { deployment } = useDeployment();
  const { data: c, error, refresh } = usePoll<CampaignDetail>(`/api/campaigns/${id}`, 4000);

  if (error && !c) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 pt-40 sm:px-8">
        <h1 className="text-[36px]">Campaign not found</h1>
        <p className="mt-2">{error}</p>
        <ButtonLink href="/campaigns" variant="secondary" className="mt-6">Back to campaigns</ButtonLink>
      </div>
    );
  }
  if (!c || !deployment) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 px-5 pt-32 sm:px-8">
        <div className="skeleton h-10 w-72 rounded-xl" />
        <div className="skeleton h-56 rounded-card" />
        <div className="skeleton h-96 rounded-card" />
      </div>
    );
  }

  const open = c.status === CampaignStatus.Open;
  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-28 sm:px-8">
      <Link href="/campaigns" className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>

      <Card className="overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={c.status} />
              <Badge>#{c.id}</Badge>
              <Badge>{c.token.symbol} · native asset {c.token.assetId ?? '—'}</Badge>
            </div>
            <div className="space-y-1.5">
              <p className="text-[14px] font-semibold text-faint">{c.brandName}</p>
              <h1 className="text-[clamp(30px,3.6vw,44px)] leading-[1.05]">{c.title}</h1>
            </div>
            <p className="max-w-2xl whitespace-pre-line text-[16px] leading-relaxed">{c.brief}</p>
          </div>
          <div className="flex flex-col justify-between gap-6 lg:min-w-[300px] lg:items-end lg:text-right">
            <div>
              <p className="text-[13px] font-semibold text-faint">Pot</p>
              <Amount value={c.pool} decimals={c.token.decimals} symbol={c.token.symbol} className="text-[44px] font-semibold leading-none tracking-[-0.045em] text-ink" />
            </div>
            {open ? (
              <ButtonLink href={`/c/${c.id}/submit`} size="lg" chevron icon={<Rocket className="size-4" />}>
                Submit your Short
              </ButtonLink>
            ) : (
              <BrandRefund c={c} d={deployment} onDone={refresh} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 border-t border-line bg-sunken/40 px-6 py-5 sm:grid-cols-4 sm:px-8">
          <Stat label="Creators">{c.creators}</Stat>
          <Stat label="Eligible views">{compact(BigInt(c.totalViews))}</Stat>
          <Stat label="Cap per creator"><Amount value={c.capPerCreator} decimals={c.token.decimals} symbol={c.token.symbol} /></Stat>
          <Stat label="Min views / Short">{Number(c.minViews).toLocaleString()}</Stat>
        </div>
        <div className="border-t border-line px-6 py-6 sm:px-8">
          <Timeline c={c} d={deployment} />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card className="space-y-5 p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[24px]">{c.snapshot ? 'Final split' : 'Live standings'}</h2>
                <p className="text-[14px]">{c.snapshot ? 'Locked by the on-chain snapshot.' : 'Projected from current views; the pot is split when the window closes.'}</p>
              </div>
            </div>
            <Leaderboard c={c} />
          </Card>
          <Submissions c={c} />
        </div>

        <div className="space-y-6">
          {c.snapshot && (
            <Card className="space-y-4 p-6">
              <div>
                <h2 className="text-[20px]">Verify the split</h2>
                <p className="text-[14px]">The snapshot lives on Portaldot. Recompute the payout root yourself.</p>
              </div>
              <VerifyPanel c={c} d={deployment} />
            </Card>
          )}
          {c.payouts.length > 0 && (
            <Card className="space-y-3 p-6">
              <h2 className="text-[20px]">Receipts</h2>
              {c.payouts.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-sunken/60 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[12.5px] text-ink">{shortAddr(p.creator ?? p.account, 6, 6)}</span>
                    <Copyable value={p.txHash} display={`tx ${p.txHash.slice(0, 10)}…`} className="text-faint" />
                  </span>
                  <span className="text-right">
                    <Amount value={p.amount} decimals={c.token.decimals} symbol={c.token.symbol} className="text-[14px] font-semibold text-ink" />
                    <span className={`block text-[12px] font-semibold ${p.status === 'paid' ? 'text-good' : 'text-bad'}`}>{p.status === 'paid' ? 'Paid' : 'Retrying'}</span>
                  </span>
                </div>
              ))}
            </Card>
          )}
          <Activity c={c} />
          <Card className="space-y-2 p-6 text-[13px]">
            <p className="font-semibold text-ink">On-chain</p>
            <p className="flex justify-between gap-2"><span className="text-faint">Contract</span><Copyable value={deployment.reachpot} /></p>
            <p className="flex justify-between gap-2"><span className="text-faint">Token</span><Copyable value={c.token.address} /></p>
            <p className="flex justify-between gap-2"><span className="text-faint">Rules hash</span><Copyable value={c.rulesHash} /></p>
            <p className="flex justify-between gap-2"><span className="text-faint">Created in</span><Copyable value={c.createTx} /></p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Submissions({ c }: { c: CampaignDetail }) {
  const [boosting, setBoosting] = useState<string | null>(null);
  if (c.submissionsList.length === 0) return null;
  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <h2 className="text-[24px]">Shorts</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {c.submissionsList.map((s) => (
          <div key={s.id} className="space-y-2">
            <a href={s.videoUrl} target="_blank" rel="noreferrer" className="group relative block">
              <ShortThumb videoId={s.videoId} className="transition-transform duration-300 group-hover:scale-[1.02]" />
              <span className="absolute bottom-2 left-2 rounded-full bg-ink/75 px-2 py-0.5 text-[12px] font-semibold text-white backdrop-blur">▶ {compact(BigInt(s.views))}</span>
              <ExternalLink className="absolute right-2 top-2 size-4 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
            </a>
            <div className="space-y-0.5">
              <p className="truncate text-[13.5px] font-semibold text-ink">{s.title ?? s.videoId}</p>
              <p className="truncate font-mono text-[12px] text-faint">{shortAddr(s.creator, 5, 4)}</p>
              {s.status !== 'verified' && <Badge tone={s.status === 'rejected' ? 'bad' : 'warn'} className="mt-1" title={s.rejectReason ?? undefined}>{s.status === 'rejected' ? 'Rejected' : 'Verifying'}</Badge>}
              {publicConfig.devWallets && c.status <= CampaignStatus.Measuring && (
                <button
                  className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline disabled:opacity-50"
                  disabled={boosting === s.videoId}
                  onClick={async () => {
                    setBoosting(s.videoId);
                    try {
                      await apiPost('/api/dev/views', { campaignId: c.id, videoId: s.videoId, views: (BigInt(s.views) + 25_000n).toString() });
                    } finally {
                      setBoosting(null);
                    }
                  }}
                >
                  <Zap className="size-3" /> +25K views (demo)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Activity({ c }: { c: CampaignDetail }) {
  if (c.activity.length === 0) return null;
  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-[20px]">Activity</h2>
      <ol className="space-y-3">
        {c.activity.slice(0, 12).map((a, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
            <span className="min-w-0 space-y-0.5">
              <span className="block text-[13.5px] leading-snug text-ink">{a.message}</span>
              <span className="flex items-center gap-2 text-[12px] text-faint">
                {new Date(a.at).toLocaleTimeString()}
                {a.tx && <Copyable value={a.tx} display={`${a.tx.slice(0, 8)}…`} className="text-faint" />}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function BrandRefund({ c, d, onDone }: { c: CampaignDetail; d: PublicDeployment; onDone: () => void }) {
  const w = useEvmWallet();
  const [busy, setBusy] = useState(false);
  const refundable = BigInt(c.refundable);
  if (refundable === 0n || !w.address || w.address.toLowerCase() !== c.brand.toLowerCase()) return null;
  return (
    <Button
      variant="secondary"
      size="lg"
      loading={busy}
      icon={<Undo2 className="size-4" />}
      onClick={async () => {
        if (!w.walletClient || !w.address) return;
        setBusy(true);
        try {
          const tx = await w.walletClient.writeContract({ account: w.walletClient.account ?? w.address, chain: w.walletClient.chain, address: d.reachpot, abi: reachpotAbi, functionName: 'refund', args: [BigInt(c.id)] });
          await publicClient.waitForTransactionReceipt({ hash: tx });
          toast.success(`Reclaimed ${fmtUnits(refundable, c.token.decimals)} ${c.token.symbol}`);
          onDone();
        } catch (e) {
          toast.error(((e as { shortMessage?: string }).shortMessage ?? (e as Error).message).slice(0, 160));
        } finally {
          setBusy(false);
        }
      }}
    >
      Reclaim {fmtUnits(refundable, c.token.decimals)} {c.token.symbol}
    </Button>
  );
}
