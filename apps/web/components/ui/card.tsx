import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-card bg-surface shadow-soft ring-1 ring-line', className)} {...props} />;
}

export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-tile bg-sunken/70 ring-1 ring-line', className)} {...props} />;
}

export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-[13px] font-semibold tracking-[-0.01em] text-faint', className)} {...props} />;
}

export function Badge({ tone = 'neutral', className, ...props }: ComponentProps<'span'> & { tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad' }) {
  const tones = {
    neutral: 'bg-sunken text-ink-2',
    accent: 'bg-accent-soft text-accent',
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
  } as const;
  return (
    <span
      className={cn('inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold tracking-[-0.01em]', tones[tone], className)}
      {...props}
    />
  );
}
