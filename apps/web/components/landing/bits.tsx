/*
 * Pure presentational building blocks shared by the story visuals (client) and the CTA tunnel (server).
 * No hooks, no 'use client' — safe to render on either side.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ---------- Demo data (one coherent campaign used across every visual) ---------- */

export type Token = 'rUSD' | 'NOVA' | 'tPOT';

export const TOKENS: Record<Token, { mark: string; coin: string }> = {
  rUSD: { mark: '$', coin: 'linear-gradient(145deg,#5fe0a0 0%,#16a868 55%,#0b7f52 100%)' },
  NOVA: { mark: 'N', coin: 'linear-gradient(145deg,#c3b2ff 0%,#7b5cff 55%,#5233e0 100%)' },
  tPOT: { mark: 'P', coin: 'linear-gradient(145deg,#ffc2ae 0%,#ff7a59 55%,#e2553a 100%)' },
};

export const CREATORS = [
  { handle: 'maya.makes', initial: 'M', tint: 'linear-gradient(145deg,#ffd9cc,#ff9f85)' },
  { handle: 'leo.films', initial: 'L', tint: 'linear-gradient(145deg,#dcd3ff,#a690ff)' },
  { handle: 'ana.cooks', initial: 'A', tint: 'linear-gradient(145deg,#d3f5e2,#7fd3a6)' },
  { handle: 'kai.moves', initial: 'K', tint: 'linear-gradient(145deg,#d4e8ff,#8db8f5)' },
  { handle: 'juno.draws', initial: 'J', tint: 'linear-gradient(145deg,#fff0c9,#f5c76b)' },
  { handle: 'sol.sounds', initial: 'S', tint: 'linear-gradient(145deg,#ffd6ea,#f59ac4)' },
] as const;

/** Soft "video still" gradients for Short placeholders — calm, never neon. */
export const SHORT_GRADIENTS = [
  'linear-gradient(165deg,#ffd9cb 0%,#ff9d80 42%,#8a6cff 100%)',
  'linear-gradient(165deg,#d8e6ff 0%,#93b4ff 45%,#5847d6 100%)',
  'linear-gradient(165deg,#dff8e8 0%,#8fdcb5 45%,#2f8a78 100%)',
  'linear-gradient(165deg,#fff0cc 0%,#ffc46e 45%,#e2633f 100%)',
  'linear-gradient(165deg,#f2dcff 0%,#c39cff 45%,#5a3dcc 100%)',
  'linear-gradient(165deg,#d9f7ff 0%,#82d2e6 45%,#3466b5 100%)',
  'linear-gradient(165deg,#ffe1ef 0%,#ff9fc6 45%,#9450d2 100%)',
  'linear-gradient(165deg,#ecebf0 0%,#bdb6c8 45%,#3f3848 100%)',
] as const;

/* ---------- Number formatting (fixed locale so server and client agree) ---------- */

export type NumberFormat = 'int' | 'money' | 'fixed1' | 'compact';

const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const moneyFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fixed1Fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatNumber(v: number, kind: NumberFormat): string {
  switch (kind) {
    case 'int':
      return intFmt.format(Math.round(v));
    case 'money':
      return moneyFmt.format(v);
    case 'fixed1':
      return fixed1Fmt.format(v);
    case 'compact': {
      const a = Math.abs(v);
      if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')}M`;
      if (a >= 1e3) return `${(v / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K`;
      return intFmt.format(Math.round(v));
    }
  }
}

/* ---------- Atoms ---------- */

export function TokenCoin({ token, className }: { token: Token; className?: string }) {
  const t = TOKENS[token];
  return (
    <span
      className={cn(
        'inline-grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_-2px_4px_rgb(0_0_0/0.15)]',
        className,
      )}
      style={{ background: t.coin }}
    >
      {t.mark}
    </span>
  );
}

export function TokenChip({ token, className }: { token: Token; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full bg-surface pl-1.5 pr-4 text-[15px] font-semibold tracking-[-0.02em] text-ink shadow-lift ring-1 ring-line',
        className,
      )}
    >
      <TokenCoin token={token} className="size-7 text-[13px]" />
      {token}
    </span>
  );
}

export function Avatar({ index, className }: { index: number; className?: string }) {
  const c = CREATORS[index % CREATORS.length];
  return (
    <span
      className={cn(
        'inline-grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold text-ink/75 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] ring-1 ring-black/5',
        className,
      )}
      style={{ background: c.tint }}
    >
      {c.initial}
    </span>
  );
}

/** Play triangle drawn in SVG so it scales crisply at any size. */
export function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.24-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6Z" />
    </svg>
  );
}

/** Abstract "video still": gradient + soft light blobs + bottom scrim. */
export function VideoStill({ gradient, className, children }: { gradient: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ background: gradient }}>
      <div className="absolute -left-[20%] top-[8%] h-[55%] w-[80%] rounded-full bg-white/35 blur-2xl" />
      <div className="absolute -right-[25%] bottom-[18%] h-[50%] w-[75%] rounded-full bg-black/10 blur-2xl" />
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
      {children}
    </div>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-1.5', className)}>
      <span className="absolute inset-0 rounded-full bg-current opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex size-1.5 rounded-full bg-current" />
    </span>
  );
}
