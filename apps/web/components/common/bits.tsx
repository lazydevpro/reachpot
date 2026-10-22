'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CampaignStatus, STATUS_LABEL, fmtUnits, shortAddr } from '@reachpot/core';
import { Badge } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function Countdown({ to, className }: { to: number; className?: string }) {
  const now = useNow();
  const s = Math.max(0, Math.floor(to - now / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3_600);
  const m = Math.floor((s % 3_600) / 60);
  const sec = s % 60;
  const text = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, '0')}`;
  return <span className={cn('tabular', className)}>{s === 0 ? 'now' : text}</span>;
}

const TONE: Record<number, 'neutral' | 'accent' | 'good' | 'warn' | 'bad'> = {
  [CampaignStatus.Scheduled]: 'neutral',
  [CampaignStatus.Open]: 'good',
  [CampaignStatus.Measuring]: 'accent',
  [CampaignStatus.AwaitingRoot]: 'accent',
  [CampaignStatus.Disputable]: 'warn',
  [CampaignStatus.Payable]: 'good',
  [CampaignStatus.Expired]: 'neutral',
  [CampaignStatus.Abandoned]: 'bad',
};

export function StatusPill({ status, className }: { status: number; className?: string }) {
  const live = status === CampaignStatus.Open || status === CampaignStatus.Measuring || status === CampaignStatus.AwaitingRoot;
  return (
    <Badge tone={TONE[status] ?? 'neutral'} className={className}>
      {live && <span className="relative mr-0.5 inline-flex size-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-current opacity-50" /><span className="relative size-1.5 rounded-full bg-current" /></span>}
      {STATUS_LABEL[status as CampaignStatus] ?? 'Unknown'}
    </Badge>
  );
}

export function Amount({ value, decimals, symbol, className, digits = 2 }: { value: string | bigint; decimals: number; symbol?: string; className?: string; digits?: number }) {
  return (
    <span className={cn('tabular', className)}>
      {fmtUnits(BigInt(value), decimals, digits)}
      {symbol && <span className="ml-1 text-[0.8em] font-semibold text-faint">{symbol}</span>}
    </span>
  );
}

export function Copyable({ value, display, className, mono = true }: { value: string; display?: string; className?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title={value}
      className={cn('group inline-flex items-center gap-1.5 rounded-lg text-ink-2 transition-colors hover:text-ink', mono && 'font-mono text-[12.5px]', className)}
    >
      {display ?? shortAddr(value, 8, 6)}
      {copied ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5 opacity-40 group-hover:opacity-100" />}
    </button>
  );
}

export function Stat({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[13px] font-semibold text-faint">{label}</p>
      <div className="text-[22px] font-semibold tracking-[-0.03em] text-ink">{children}</div>
    </div>
  );
}

/** Gradient "thumbnail" for a Short (mock videos have no real thumbnail). */
export function ShortThumb({ videoId, className }: { videoId: string; className?: string }) {
  let h = 0;
  for (const c of videoId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = h % 360;
  const b = (a + 40 + (h % 80)) % 360;
  return (
    <div
      className={cn('relative aspect-[9/16] overflow-hidden rounded-xl', className)}
      style={{ background: `linear-gradient(160deg, hsl(${a} 80% 78%), hsl(${b} 70% 58%))` }}
      aria-hidden
    >
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid size-7 place-items-center rounded-full bg-white/80 shadow-pill">
          <span className="ml-0.5 border-y-[5px] border-l-[8px] border-y-transparent border-l-ink" />
        </span>
      </div>
    </div>
  );
}
